import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getStudents } from "@/lib/api/students";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { exportStudentsToExcel, workbookToBlob } from "@/lib/utils/excel";
import { logExport } from "@/lib/utils/logger";
import { checkExportLimit } from "@/lib/utils/export";
import type { StudentWithDetails } from "@/types";

/**
 * GET /api/students/export - 导出学生列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.STUDENT_EXPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const class_id = searchParams.get("class_id");
    const grade_id = searchParams.get("grade_id");
    const semester_id = searchParams.get("semester_id");
    const is_active = searchParams.get("is_active");

    // 构建查询参数（不分页，获取所有）
    const params: {
      class_id?: number;
      grade_id?: number;
      semester_id?: number;
      is_active?: number;
      limit: number;
    } = {
      limit: 10000, // 获取所有数据
    };

    if (class_id) {
      params.class_id = parseInt(class_id, 10);
    }
    if (grade_id) {
      params.grade_id = parseInt(grade_id, 10);
    }
    if (semester_id) {
      params.semester_id = parseInt(semester_id, 10);
    }
    if (is_active) {
      params.is_active = parseInt(is_active, 10);
    }

    // 获取学生数据（不分页，获取所有）
    const result = getStudents(params) as { data: StudentWithDetails[] };

    // 检查导出行数是否超过系统限制
    const limitCheck = await checkExportLimit(result.data.length);
    if (!limitCheck.canExport) {
      return NextResponse.json({ error: limitCheck.message }, { status: 400 });
    }

    // 生成 Excel 文件
    const workbook = exportStudentsToExcel(result.data);
    const blob = workbookToBlob(workbook);

    // 记录导出日志
    await logExport(currentUser.id, "students", `导出学生列表，共 ${result.data.length} 条记录`);

    // 生成文件名并编码（支持中文）
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const encodedFilename = encodeURIComponent(`学生列表_${timestamp}.xlsx`);

    // 设置响应头
    return new NextResponse(blob as Blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("导出学生列表失败:", error);
    return NextResponse.json({ error: "导出学生列表失败" }, { status: 500 });
  }
}
