import { getNumberConfig } from "@/lib/api/system-config";

/**
 * 导出限制检查结果
 */
export interface ExportLimitCheckResult {
  /** 是否可以导出 */
  canExport: boolean;
  /** 系统配置的限制行数 */
  limit: number;
  /** 实际数据行数 */
  actual: number;
  /** 错误提示信息（当不可导出时） */
  message?: string;
}

/**
 * 检查导出行数是否超过系统配置的限制
 * @param actualRows - 实际要导出的数据行数
 * @returns 导出限制检查结果
 */
export async function checkExportLimit(actualRows: number): Promise<ExportLimitCheckResult> {
  const limit = await getNumberConfig("system.max_export_rows", 10000);

  if (actualRows > limit) {
    return {
      canExport: false,
      limit,
      actual: actualRows,
      message: `导出数据量（${actualRows}行）超过系统限制（${limit}行），请缩小查询范围后重试`,
    };
  }

  return {
    canExport: true,
    limit,
    actual: actualRows,
  };
}
