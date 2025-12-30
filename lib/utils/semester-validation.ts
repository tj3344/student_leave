import { getRawPostgres } from "@/lib/db";

/**
 * 验证结果类型
 */
export interface ValidationResult {
  success: boolean;
  message?: string;
}

/**
 * 检查学期日期范围是否与现有学期重叠
 *
 * 重叠判断逻辑：
 * 两个学期 [A_start, A_end] 和 [B_start, B_end] 重叠的条件是：
 * A_start <= B_end AND A_end >= B_start
 *
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param excludeId 排除的学期ID（用于编辑时排除自身）
 * @returns 验证结果
 */
export async function validateSemesterOverlap(
  startDate: string,
  endDate: string,
  excludeId?: number
): Promise<ValidationResult> {
  const pgClient = getRawPostgres();

  // 构建查询条件 - 检查日期范围重叠
  // 重叠条件：新学期开始日期 <= 已有学期结束日期
  //           AND 新学期结束日期 >= 已有学期开始日期
  const params: (string | number)[] = [startDate, endDate];
  let whereClause = "WHERE ($1 <= end_date) AND ($2 >= start_date)";

  // 如果是编辑，排除自身记录
  if (excludeId) {
    whereClause += " AND id != $" + (params.length + 1);
    params.push(excludeId);
  }

  const query = `SELECT id, name, start_date, end_date FROM semesters ${whereClause}`;
  const result = await pgClient.unsafe(query, params);

  if (result.length > 0) {
    // 获取重叠学期的详细信息
    const overlapping = result
      .map((r: { name: string; start_date: string; end_date: string }) =>
        `${r.name}（${r.start_date} 至 ${r.end_date}）`
      )
      .join("、");

    return {
      success: false,
      message: `学期日期范围与现有学期重叠：${overlapping}`,
    };
  }

  return { success: true };
}

/**
 * 完整的学期验证（前端使用）
 * Zod schema 已经处理了大部分验证，此函数用于学期重叠检查
 *
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param excludeId 排除的学期ID（用于编辑时）
 * @returns 验证结果
 */
export async function validateSemesterDates(
  startDate: string,
  endDate: string,
  excludeId?: number
): Promise<ValidationResult> {
  // 检查学期重叠
  const overlapResult = await validateSemesterOverlap(startDate, endDate, excludeId);
  if (!overlapResult.success) {
    return overlapResult;
  }

  return { success: true };
}
