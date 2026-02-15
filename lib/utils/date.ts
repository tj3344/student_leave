import { format, addDays, differenceInBusinessDays, parseISO, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * 格式化日期为中文格式
 */
export function formatDate(date: Date | string, formatStr?: string): string {
  let d: Date;

  if (typeof date === "string") {
    // 尝试用 parseISO 解析 ISO 格式
    d = parseISO(date);

    // 如果 parseISO 失败，尝试其他格式
    if (!isValid(d)) {
      // 尝试直接用 new Date 解析（处理 JavaScript Date toString 格式等）
      d = new Date(date);

      // 如果仍然无效，返回空字符串
      if (!isValid(d)) {
        return "";
      }
    }
  } else {
    d = date;
  }

  // 最终验证
  if (!isValid(d)) {
    return "";
  }

  return format(d, formatStr || "yyyy-MM-dd", { locale: zhCN });
}

/**
 * 格式化为完整的日期时间
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, "yyyy-MM-dd HH:mm:ss");
}

/**
 * 计算两个日期之间的天数（包含周末）
 */
export function calculateDays(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 计算工作日天数（不包含周末）
 */
export function calculateWorkDays(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
  return differenceInBusinessDays(end, start) + 1;
}

/**
 * 获取当前日期字符串
 */
export function getCurrentDate(): string {
  return formatDate(new Date());
}

/**
 * 获取当前日期时间字符串
 */
export function getCurrentDateTime(): string {
  return formatDateTime(new Date());
}

/**
 * 验证日期范围是否有效
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  return start <= end;
}

/**
 * 检查日期是否在学期范围内
 */
export function isDateInSemester(date: string, semesterStart: string, semesterEnd: string): boolean {
  const checkDate = parseISO(date);
  const start = parseISO(semesterStart);
  const end = parseISO(semesterEnd);
  return checkDate >= start && checkDate <= end;
}

/**
 * 获取学期的所有日期
 */
export function getSemesterDays(startDate: string, endDate: string): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days: string[] = [];
  let current = start;

  while (current <= end) {
    days.push(formatDate(current));
    current = addDays(current, 1);
  }

  return days;
}
