"use client";

import { formatDate } from "@/lib/utils/date";
import { LEAVE_STATUS_NAMES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/refund";
import type { LeaveWithDetails } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Check, X, Trash2 } from "lucide-react";

interface LeaveTableProps {
  data: LeaveWithDetails[];
  showReviewActions?: boolean;
  onViewDetail?: (leave: LeaveWithDetails) => void;
  onApprove?: (leave: LeaveWithDetails) => void;
  onReject?: (leave: LeaveWithDetails) => void;
  onDelete?: (leave: LeaveWithDetails) => void;
}

export function LeaveTable({
  data,
  showReviewActions = false,
  onViewDetail,
  onApprove,
  onReject,
  onDelete,
}: LeaveTableProps) {

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: "secondary" as const, label: LEAVE_STATUS_NAMES.pending },
      approved: { variant: "default" as const, label: LEAVE_STATUS_NAMES.approved },
      rejected: { variant: "destructive" as const, label: LEAVE_STATUS_NAMES.rejected },
    };
    const { variant, label } = config[status as keyof typeof config] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>暂无请假记录</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>学生</TableHead>
            <TableHead>班级</TableHead>
            <TableHead>学期</TableHead>
            <TableHead>请假时间</TableHead>
            <TableHead>天数</TableHead>
            <TableHead>事由</TableHead>
            <TableHead>退费</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>申请人</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((leave) => (
            <TableRow key={leave.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{leave.student_name}</div>
                  <div className="text-sm text-muted-foreground">{leave.student_no}</div>
                </div>
              </TableCell>
              <TableCell>{leave.class_name}</TableCell>
              <TableCell>{leave.semester_name}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{formatDate(leave.start_date)}</div>
                  <div className="text-muted-foreground">至 {formatDate(leave.end_date)}</div>
                </div>
              </TableCell>
              <TableCell>{leave.leave_days} 天</TableCell>
              <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                {leave.reason}
              </TableCell>
              <TableCell>
                {leave.is_refund === 1 && leave.refund_amount ? (
                  <span className="text-green-600">{formatCurrency(leave.refund_amount)}</span>
                ) : leave.is_nutrition_meal === 1 ? (
                  <span className="text-orange-600 text-sm">营养餐不退</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(leave.status)}</TableCell>
              <TableCell>{leave.applicant_name}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {onViewDetail && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail(leave)}
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {showReviewActions && leave.status === "pending" && (
                    <>
                      {onApprove && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => onApprove(leave)}
                          title="批准"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {onReject && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onReject(leave)}
                          title="拒绝"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {onDelete && leave.status !== "approved" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(leave)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
