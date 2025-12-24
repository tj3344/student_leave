import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getStudents, createStudent, batchCreateStudents } from "@/lib/api/students";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { StudentInput } from "@/types";

/**
 * GET /api/students - 获取学生列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.STUDENT_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const class_id = searchParams.get("class_id");
    const grade_id = searchParams.get("grade_id");
    const is_active = searchParams.get("is_active");
    const sort = searchParams.get("sort") || "created_at";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    // 班主任角色：只看本班学生
    let filterClassId = class_id ? parseInt(class_id, 10) : undefined;
    if (currentUser.role === "class_teacher") {
      // 获取班主任管理的班级ID
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      const managedClass = db.prepare(
        "SELECT id FROM classes WHERE class_teacher_id = ?"
      ).get(currentUser.id) as { id: number } | undefined;

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

    // 获取学生列表
    const result = getStudents({
      page,
      limit,
      search: search || undefined,
      class_id: filterClassId,
      grade_id: grade_id ? parseInt(grade_id, 10) : undefined,
      is_active: is_active ? parseInt(is_active, 10) : undefined,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取学生列表失败:", error);
    return NextResponse.json({ error: "获取学生列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/students - 创建学生（单个或批量）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.STUDENT_CREATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const isBatch = Array.isArray(body);

    if (isBatch) {
      // 批量创建
      const studentsInput = body as StudentInput[];
      if (studentsInput.length === 0) {
        return NextResponse.json({ error: "学生列表不能为空" }, { status: 400 });
      }

      const result = batchCreateStudents(studentsInput);

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json(
        {
          success: true,
          createdCount: result.createdCount,
          message: result.message,
          errors: result.errors,
        },
        { status: 201 }
      );
    } else {
      // 单个创建
      const studentInput = body as StudentInput;

      // 验证必填字段
      if (!studentInput.student_no || !studentInput.name || !studentInput.class_id) {
        return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
      }

      const result = createStudent(studentInput);

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json(
        { success: true, studentId: result.studentId, message: "学生创建成功" },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("创建学生失败:", error);
    return NextResponse.json({ error: "创建学生失败" }, { status: 500 });
  }
}
