import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getFeeConfigs } from "@/lib/api/fees";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { exportFeeConfigsToExcel, workbookToBlob } from "@/lib/utils/excel";
import type { FeeConfigWithDetails } from "@/types";

/**
 * GET /api/fee-configs/export - 导出费用配置列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.FEE_EXPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const semester_id = searchParams.get("semester_id");

    // 构建查询参数（不传分页参数以获取所有数据）
    const params: {
      semester_id?: number;
    } = {};

    if (semester_id) {
      params.semester_id = parseInt(semester_id, 10);
    }

    // 获取费用配置数据（不分页，获取所有）
    const feeConfigs = getFeeConfigs(params) as FeeConfigWithDetails[];

    // 生成 Excel 文件（将可选字段转换为字符串）
    const exportData = feeConfigs.map((f) => ({
      semester_name: f.semester_name || "",
      grade_name: f.grade_name || "",
      class_name: f.class_name || "",
      class_teacher_name: f.class_teacher_name,
      meal_fee_standard: f.meal_fee_standard,
      prepaid_days: f.prepaid_days,
      actual_days: f.actual_days,
      suspension_days: f.suspension_days,
    }));
    const workbook = exportFeeConfigsToExcel(exportData);
    const blob = workbookToBlob(workbook);

    // 生成文件名并编码（支持中文）
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `fee_configs_${timestamp}.xlsx`;
    const encodedFilename = encodeURIComponent(`费用配置列表_${timestamp}.xlsx`);

    // 设置响应头
    return new NextResponse(blob as Blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("导出费用配置列表失败:", error);
    return NextResponse.json({ error: "导出费用配置列表失败" }, { status: 500 });
  }
}
