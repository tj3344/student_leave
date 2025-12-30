import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getStudentRefundRecords } from "@/lib/api/fees";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { exportRefundRecordsToExcel, workbookToBlob } from "@/lib/utils/excel";
import { checkExportLimit } from "@/lib/utils/export";

/**
 * GET /api/fees/refunds/export - 导出退费记录
 */
export async function GET(request: NextRequest) {
  try {
    // 权限验证
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (!hasPermission(currentUser.role, PERMISSIONS.REFUND_EXPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const semester_id = searchParams.get("semester_id");
    const class_id = searchParams.get("class_id");

    const params: { semester_id?: number; class_id?: number } = {};
    if (semester_id) params.semester_id = parseInt(semester_id, 10);
    if (class_id) params.class_id = parseInt(class_id, 10);

    // 获取所有退费记录（不分页）
    const result = getStudentRefundRecords(params);
    const refundRecords = Array.isArray(result) ? result : result.data;

    if (refundRecords.length === 0) {
      return NextResponse.json({ error: "暂无退费记录可导出" }, { status: 400 });
    }

    // 检查导出行数是否超过系统限制
    const limitCheck = await checkExportLimit(refundRecords.length);
    if (!limitCheck.canExport) {
      return NextResponse.json({ error: limitCheck.message }, { status: 400 });
    }

    // 生成 Excel
    const workbook = exportRefundRecordsToExcel(refundRecords);
    const blob = workbookToBlob(workbook);

    // 文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const encodedFilename = encodeURIComponent(`退费记录_${timestamp}.xlsx`);

    return new NextResponse(blob as Blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("导出退费记录失败:", error);
    return NextResponse.json({ error: "导出退费记录失败" }, { status: 500 });
  }
}
