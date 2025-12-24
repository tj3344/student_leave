"use client";

import type { StudentRefundRecord } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RefundRecordTableProps {
  data: StudentRefundRecord[];
}

export function RefundRecordTable({ data }: RefundRecordTableProps) {
  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>学号</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>班级</TableHead>
            <TableHead className="text-center">预收天数</TableHead>
            <TableHead className="text-center">实收天数</TableHead>
            <TableHead className="text-center">请假天数</TableHead>
            <TableHead className="text-center">停课天数</TableHead>
            <TableHead className="text-right">餐费标准</TableHead>
            <TableHead className="text-right">退费金额</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                暂无退费记录
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.student_id}>
                <TableCell className="font-medium">{item.student_no}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.name}
                    {item.is_nutrition_meal === 1 && (
                      <Badge variant="secondary" className="text-xs">营养餐</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.grade_name} {item.class_name}
                </TableCell>
                <TableCell className="text-center">{item.prepaid_days}</TableCell>
                <TableCell className="text-center">{item.actual_days}</TableCell>
                <TableCell className="text-center">{item.leave_days}</TableCell>
                <TableCell className="text-center">{item.suspension_days}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.meal_fee_standard)}</TableCell>
                <TableCell className="text-right">
                  <span className={item.refund_amount > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                    {formatCurrency(item.refund_amount)}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
