import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getClasses } from "@/lib/api/classes";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { exportClassesToExcel, workbookToBlob } from "@/lib/utils/excel";
import { getRawPostgres } from "@/lib/db";
import type { ClassWithDetails } from "@/types";

/**
 * GET /api/classes/export - 导出班级列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.CLASS_EXPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const semester_id = searchParams.get("semester_id");
    const grade_id = searchParams.get("grade_id");

    // 构建查询参数
    const params: {
      semester_id?: number;
      grade_id?: number;
    } = {};

    if (semester_id) {
      params.semester_id = parseInt(semester_id, 10);
    }
    if (grade_id) {
      params.grade_id = parseInt(grade_id, 10);
    }

    // 获取班级数据（不分页，获取所有）
    const classes = getClasses(params) as ClassWithDetails[];

    // 获取学期名称
    const pgClient = getRawPostgres();
    const semesterIds = [...new Set(classes.map((c) => c.semester_id))];
    const semesters = await pgClient.unsafe(
      `SELECT id, name FROM semesters WHERE id IN (${semesterIds.map((_, i) => `$${i + 1}`).join(',')})`,
      semesterIds
    ) as Array<{ id: number; name: string }>;

    const semesterMap = new Map(semesterIds.map((id) => [id, semesters.find((s) => s.id === id)?.name || '']));

    // 转换数据格式
    const exportData = classes.map((c) => ({
      semester_name: semesterMap.get(c.semester_id) || '',
      grade_name: c.grade_name || '',
      name: c.name,
      class_teacher_name: c.class_teacher_name || '',
      student_count: c.student_count,
    }));

    // 生成 Excel 文件
    const workbook = exportClassesToExcel(exportData);
    const blob = workbookToBlob(workbook);

    // 生成文件名并编码（支持中文）
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `classes_${timestamp}.xlsx`;
    const encodedFilename = encodeURIComponent(`班级列表_${timestamp}.xlsx`);

    // 设置响应头
    return new NextResponse(blob as Blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("导出班级列表失败:", error);
    return NextResponse.json({ error: "导出班级列表失败" }, { status: 500 });
  }
}
