import { getDb } from "@/lib/db";
import { getNumberConfig } from "@/lib/api/system-config";

/**
 * 验证结果接口
 */
export interface ValidationResult {
  success: boolean;
  message?: string;
}

/**
 * 计算补请假天数（开始日期相对于今天的天数差）
 * @param startDate 请假开始日期 (YYYY-MM-DD)
 * @returns 负数表示过去的天数，0或正数表示今天或未来
 */
export function calculateRetroactiveDays(startDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - today.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 验证补请假天数限制
 * @param startDate 请假开始日期
 * @returns 验证结果
 */
export function validateRetroactiveDays(startDate: string): ValidationResult {
  const retroactiveDays = calculateRetroactiveDays(startDate);
  const maxRetroactiveDays = getNumberConfig("leave.retroactive_days", 0);

  // 如果是过去的日期
  if (retroactiveDays < 0) {
    if (maxRetroactiveDays === 0) {
      return {
        success: false,
        message: "系统设置禁止补请假，只能申请未来日期"
      };
    }
    if (Math.abs(retroactiveDays) > maxRetroactiveDays) {
      return {
        success: false,
        message: `只允许补请假${maxRetroactiveDays}天内的记录，当前申请开始日期已超过${Math.abs(retroactiveDays)}天`
      };
    }
  }

  return { success: true };
}

/**
 * 检查请假日期是否与已有记录重叠（严格边界，不允许接触）
 * @param studentId 学生ID
 * @param semesterId 学期ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param excludeId 排除的记录ID（用于编辑时排除自身）
 * @returns 验证结果
 */
export function validateDateOverlap(
  studentId: number,
  semesterId: number,
  startDate: string,
  endDate: string,
  excludeId?: number
): ValidationResult {
  const db = getDb();

  // 构建查询条件 - 严格边界检查：使用 < 而不是 <=
  // 当新记录开始日期 < 已有记录结束日期 OR 新记录结束日期 > 已有记录开始日期 时，视为重叠
  let whereClause = "WHERE student_id = ? AND semester_id = ? AND status IN ('pending', 'approved') AND ((? < end_date) OR (? > start_date))";
  const params: (number | string)[] = [studentId, semesterId, startDate, endDate];

  // 如果是编辑，排除自身记录
  if (excludeId) {
    whereClause += " AND id != ?";
    params.push(excludeId);
  }

  const query = `SELECT COUNT(*) as count FROM leave_records ${whereClause}`;
  const result = db.prepare(query).get(...params) as { count: number };

  if (result.count > 0) {
    // 获取重叠记录的详细信息用于友好提示
    const detailQuery = `
      SELECT start_date, end_date, status
      FROM leave_records
      WHERE student_id = ? AND semester_id = ? AND status IN ('pending', 'approved')
        AND ((? < end_date) OR (? > start_date))
        ${excludeId ? "AND id != ?" : ""}
      LIMIT 3
    `;
    const overlappingRecords = db.prepare(detailQuery).all(...params) as {
      start_date: string;
      end_date: string;
      status: string;
    }[];

    const details = overlappingRecords
      .map(r => `${r.start_date}至${r.end_date}(${r.status === 'pending' ? '待审核' : '已批准'})`)
      .join("; ");

    return {
      success: false,
      message: `请假日期与已有记录重叠：${details}`
    };
  }

  return { success: true };
}

/**
 * 组合验证：补请假 + 日期重叠
 * @param studentId 学生ID
 * @param semesterId 学期ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param excludeId 排除的记录ID（用于编辑时）
 * @returns 验证结果
 */
export function validateLeaveRequest(
  studentId: number,
  semesterId: number,
  startDate: string,
  endDate: string,
  excludeId?: number
): ValidationResult {
  // 先验证补请假天数
  const retroactiveResult = validateRetroactiveDays(startDate);
  if (!retroactiveResult.success) {
    return retroactiveResult;
  }

  // 再验证日期重叠
  const overlapResult = validateDateOverlap(
    studentId,
    semesterId,
    startDate,
    endDate,
    excludeId
  );
  if (!overlapResult.success) {
    return overlapResult;
  }

  return { success: true };
}
