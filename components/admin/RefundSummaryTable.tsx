"use client";

import type { ClassRefundSummaryFull } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RefundSummaryTableProps {
  data: ClassRefundSummaryFull[];
}

export function RefundSummaryTable({ data }: RefundSummaryTableProps) {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `¥${isNaN(num) ? "0.00" : num.toFixed(2)}`;
  };

  // 计算总计 - 确保将所有值转换为数字，避免字符串拼接
  const totals = data.reduce(
    (acc, item) => ({
      studentCount: acc.studentCount + Number(item.student_count || 0),
      refundStudentsCount: acc.refundStudentsCount + Number(item.refund_students_count || 0),
      totalLeaveDays: acc.totalLeaveDays + Number(item.total_leave_days || 0),
      totalRefundAmount: acc.totalRefundAmount + Number(item.total_refund_amount || 0),
    }),
    { studentCount: 0, refundStudentsCount: 0, totalLeaveDays: 0, totalRefundAmount: 0 }
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>班级</TableHead>
            <TableHead>班主任</TableHead>
            <TableHead className="text-center">学生人数</TableHead>
            <TableHead className="text-right">餐费标准</TableHead>
            <TableHead className="text-center">预收天数</TableHead>
            <TableHead className="text-center">实收天数</TableHead>
            <TableHead className="text-center">停课天数</TableHead>
            <TableHead className="text-center">总请假天数</TableHead>
            <TableHead className="text-right">退费总金额</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                暂无退费汇总数据
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.class_id}>
                  <TableCell className="font-medium">
                    {item.grade_name} {item.class_name}
                  </TableCell>
                  <TableCell>{item.class_teacher_name || "-"}</TableCell>
                  <TableCell className="text-center">{Number(item.student_count || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.meal_fee_standard)}</TableCell>
                  <TableCell className="text-center">{Number(item.prepaid_days || 0)}</TableCell>
                  <TableCell className="text-center">{Number(item.actual_days || 0)}</TableCell>
                  <TableCell className="text-center">{Number(item.suspension_days || 0)}</TableCell>
                  <TableCell className="text-center">{Number(item.total_leave_days || 0)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.total_refund_amount)}
                  </TableCell>
                </TableRow>
              ))}
              {/* 合计行 */}
              {data.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2} className="text-right">
                    合计：
                  </TableCell>
                  <TableCell className="text-center">{totals.studentCount}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-center">{totals.totalLeaveDays}</TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrency(totals.totalRefundAmount)}
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
