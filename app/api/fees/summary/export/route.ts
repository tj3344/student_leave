import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getClassRefundSummary } from "@/lib/api/fees";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { exportRefundSummaryToExcel, workbookToBlob } from "@/lib/utils/excel";
import { checkExportLimit } from "@/lib/utils/export";

/**
 * GET /api/fees/summary/export - 导出退费汇总
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

    const params: { semester_id?: number } = {};
    if (semester_id) params.semester_id = parseInt(semester_id, 10);

    // 获取退费汇总数据
    const summaryData = getClassRefundSummary(params);

    if (summaryData.length === 0) {
      return NextResponse.json({ error: "暂无退费汇总数据可导出" }, { status: 400 });
    }

    // 检查导出行数是否超过系统限制
    const limitCheck = await checkExportLimit(summaryData.length);
    if (!limitCheck.canExport) {
      return NextResponse.json({ error: limitCheck.message }, { status: 400 });
    }

    // 计算总计
    const totals = summaryData.reduce(
      (acc, item) => ({
        studentCount: acc.studentCount + item.student_count,
        refundStudentsCount: acc.refundStudentsCount + item.refund_students_count,
        totalLeaveDays: acc.totalLeaveDays + item.total_leave_days,
        totalRefundAmount: acc.totalRefundAmount + item.total_refund_amount,
      }),
      { studentCount: 0, refundStudentsCount: 0, totalLeaveDays: 0, totalRefundAmount: 0 }
    );

    // 生成 Excel
    const workbook = exportRefundSummaryToExcel(summaryData, totals);
    const blob = workbookToBlob(workbook);

    // 文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const encodedFilename = encodeURIComponent(`退费汇总_${timestamp}.xlsx`);

    return new NextResponse(blob as Blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("导出退费汇总失败:", error);
    return NextResponse.json({ error: "导出退费汇总失败" }, { status: 500 });
  }
}
