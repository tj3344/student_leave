import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getLeaves } from "@/lib/api/leaves";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { exportLeavesToExcel, workbookToBlob } from "@/lib/utils/excel";
import type { LeaveWithDetails } from "@/types";

/**
 * GET /api/leaves/export - 导出请假列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_EXPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const class_id = searchParams.get("class_id");
    const semester_id = searchParams.get("semester_id");
    const status = searchParams.get("status");

    // 构建查询参数（不分页，获取所有）
    const params: {
      search?: string;
      class_id?: number;
      semester_id?: number;
      status?: string;
      limit: number;
    } = {
      limit: 10000, // 获取所有数据
    };

    if (search) params.search = search;
    if (class_id) params.class_id = parseInt(class_id, 10);
    if (semester_id) params.semester_id = parseInt(semester_id, 10);
    if (status) params.status = status;

    // 教师只能导出自己申请的请假记录
    let applicant_id: number | undefined;
    if (currentUser.role === "teacher") {
      applicant_id = currentUser.id;
    }

    // 班主任角色：只导出本班学生请假
    let filterClassId = params.class_id;
    if (currentUser.role === "class_teacher") {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      const managedClass = db.prepare(
        "SELECT id FROM classes WHERE class_teacher_id = ?"
      ).get(currentUser.id) as { id: number } | undefined;

      if (managedClass) {
        filterClassId = managedClass.id;
      } else {
        // 没有分配班级，返回空文件
        const workbook = exportLeavesToExcel([]);
        const blob = workbookToBlob(workbook);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const encodedFilename = encodeURIComponent(`请假列表_${timestamp}.xlsx`);
        return new NextResponse(blob as Blob, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
          },
        });
      }
    }

    // 添加申请人筛选和班级筛选
    if (applicant_id) {
      (params as typeof params & { applicant_id: number }).applicant_id = applicant_id;
    }
    if (filterClassId) {
      params.class_id = filterClassId;
    }

    // 获取请假数据（不分页，获取所有）
    const result = getLeaves(params) as { data: LeaveWithDetails[] };

    // 生成 Excel 文件
    const workbook = exportLeavesToExcel(result.data);
    const blob = workbookToBlob(workbook);

    // 生成文件名并编码（支持中文）
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const encodedFilename = encodeURIComponent(`请假列表_${timestamp}.xlsx`);

    // 设置响应头
    return new NextResponse(blob as Blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("导出请假列表失败:", error);
    return NextResponse.json({ error: "导出请假列表失败" }, { status: 500 });
  }
}
