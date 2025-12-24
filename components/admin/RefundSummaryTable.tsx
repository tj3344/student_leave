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
  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 计算总计
  const totals = data.reduce(
    (acc, item) => ({
      studentCount: acc.studentCount + item.student_count,
      refundStudentsCount: acc.refundStudentsCount + item.refund_students_count,
      totalLeaveDays: acc.totalLeaveDays + item.total_leave_days,
      totalRefundAmount: acc.totalRefundAmount + item.total_refund_amount,
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
                  <TableCell className="text-center">{item.student_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.meal_fee_standard)}</TableCell>
                  <TableCell className="text-center">{item.prepaid_days}</TableCell>
                  <TableCell className="text-center">{item.actual_days}</TableCell>
                  <TableCell className="text-center">{item.suspension_days}</TableCell>
                  <TableCell className="text-center">{item.total_leave_days}</TableCell>
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
