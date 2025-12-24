/**
 * 临时脚本：重新计算所有请假记录的退费金额
 * 使用方法：npx tsx scripts/recalculate-refunds.ts
 */

import { getDb } from "../lib/db";

const db = getDb();

// 获取所有需要更新的请假记录
const leaves = db
  .prepare(`
    SELECT lr.id, lr.student_id, lr.semester_id, lr.leave_days, lr.is_refund, lr.refund_amount as old_amount,
           s.is_nutrition_meal,
           fc.meal_fee_standard
    FROM leave_records lr
    LEFT JOIN students s ON lr.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = lr.semester_id
    WHERE lr.is_refund = 1
  `)
  .all() as {
    id: number;
    student_id: number;
    semester_id: number;
    leave_days: number;
    is_refund: number;
    old_amount: number | null;
    is_nutrition_meal: number;
    meal_fee_standard: number | null;
  }[];

let updatedCount = 0;
let totalChange = 0;

console.log(`找到 ${leaves.length} 条需要更新的请假记录`);

for (const leave of leaves) {
  const isNutritionMeal = leave.is_nutrition_meal === 1;
  const mealFeeStandard = leave.meal_fee_standard ?? 0;
  const newAmount = isNutritionMeal ? null : leave.leave_days * mealFeeStandard;

  if (leave.old_amount !== newAmount) {
    db.prepare(
      `UPDATE leave_records SET refund_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(newAmount, leave.id);

    const change = (newAmount || 0) - (leave.old_amount || 0);
    totalChange += change;
    updatedCount++;

    console.log(`记录 ${leave.id}: 学生 ${leave.student_id}, 请假 ${leave.leave_days} 天`);
    console.log(`  旧金额: ¥${(leave.old_amount || 0).toFixed(2)} -> 新金额: ¥${(newAmount || 0).toFixed(2)} (变化: ¥${change.toFixed(2)})`);
    console.log(`  餐费标准: ¥${mealFeeStandard.toFixed(2)}`);
  }
}

console.log(`\n总计更新 ${updatedCount} 条记录，总变化: ¥${totalChange.toFixed(2)}`);
