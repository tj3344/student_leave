/**
 * 计算每日退费金额
 * @param mealFee 班级伙食费标准（元/学期）
 * @param schoolDays 学期在校天数
 * @returns 每日退费金额
 */
export function calculateDailyRefund(mealFee: number, schoolDays: number): number {
  if (schoolDays <= 0) return 0;
  return Number((mealFee / schoolDays).toFixed(2));
}

/**
 * 计算退费金额
 * @param leaveDays 请假天数
 * @param dailyRefund 每日退费金额
 * @returns 退费金额
 */
export function calculateRefundAmount(leaveDays: number, dailyRefund: number): number {
  return Number((leaveDays * dailyRefund).toFixed(2));
}

/**
 * 完整退费计算
 * @param mealFee 班级伙食费标准
 * @param schoolDays 学期在校天数
 * @param leaveDays 请假天数
 * @param isNutritionMeal 是否享受营养餐（营养餐学生不退费）
 * @returns 退费金额
 */
export function calculateRefund(
  mealFee: number,
  schoolDays: number,
  leaveDays: number,
  isNutritionMeal: boolean = false
): number {
  // 营养餐学生不退费
  if (isNutritionMeal) {
    return 0;
  }

  const dailyRefund = calculateDailyRefund(mealFee, schoolDays);
  return calculateRefundAmount(leaveDays, dailyRefund);
}

/**
 * 格式化金额显示（支持 number 和 string 类型）
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `¥${isNaN(num) ? "0.00" : num.toFixed(2)}`;
}

/**
 * 安全地将金额转换为数字（用于 Excel 导出等场景）
 */
export function toFixedNumber(amount: number | string | null | undefined, digits: number = 2): string {
  if (amount === null || amount === undefined) return "0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num) ? "0.00" : num.toFixed(digits);
}

/**
 * 验证退费金额是否有效
 */
export function isValidRefundAmount(amount: number): boolean {
  return amount >= 0 && Number.isFinite(amount);
}
