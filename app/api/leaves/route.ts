import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getLeaves, createLeave } from "@/lib/api/leaves";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { logCreate } from "@/lib/utils/logger";
import type { LeaveInput } from "@/types";

/**
 * GET /api/leaves - 获取请假记录列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const student_id = searchParams.get("student_id");
    const class_id = searchParams.get("class_id");
    const semester_id = searchParams.get("semester_id");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") || "created_at";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    // 教师只能查看自己申请的请假记录
    let applicant_id: number | undefined;
    if (currentUser.role === "teacher") {
      applicant_id = currentUser.id;
    }

    // 班主任角色：只看本班学生请假
    let filterClassId = class_id ? parseInt(class_id, 10) : undefined;
    if (currentUser.role === "class_teacher") {
      // 获取班主任管理的班级ID
      const { getRawPostgres } = await import("@/lib/db");
      const pgClient = getRawPostgres();
      const managedClassResult = await pgClient.unsafe(
        "SELECT id FROM classes WHERE class_teacher_id = $1",
        [currentUser.id]
      );
      const managedClass = managedClassResult[0] as { id: number } | undefined;

      if (managedClass) {
        filterClassId = managedClass.id;
      } else {
        // 没有分配班级，返回空列表
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
      }
    }

    // 获取请假记录列表
    const result = getLeaves({
      page,
      limit,
      search: search || undefined,
      student_id: student_id ? parseInt(student_id, 10) : undefined,
      class_id: filterClassId,
      semester_id: semester_id ? parseInt(semester_id, 10) : undefined,
      status: status || undefined,
      applicant_id,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取请假记录列表失败:", error);
    return NextResponse.json({ error: "获取请假记录列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/leaves - 创建请假申请
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_CREATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const leaveInput = body as LeaveInput;

    // 验证必填字段
    if (!leaveInput.student_id || !leaveInput.semester_id || !leaveInput.start_date || !leaveInput.end_date || !leaveInput.leave_days || !leaveInput.reason) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 验证日期范围
    if (leaveInput.start_date > leaveInput.end_date) {
      return NextResponse.json({ error: "开始日期不能晚于结束日期" }, { status: 400 });
    }

    // 创建请假申请
    const result = createLeave(leaveInput, currentUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // 记录创建请假日志
    await logCreate(currentUser.id, "leaves", `创建请假申请：学生ID ${leaveInput.student_id}，请假 ${leaveInput.leave_days} 天`);

    return NextResponse.json(
      { success: true, leaveId: result.leaveId, message: "请假申请创建成功" },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建请假申请失败:", error);
    return NextResponse.json({ error: "创建请假申请失败" }, { status: 500 });
  }
}
