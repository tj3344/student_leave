"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/refund";
import type { LeaveWithDetails } from "@/types";
import { Badge } from "@/components/ui/badge";

interface LeaveReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leave: LeaveWithDetails | null;
  mode: "approve" | "reject" | "view";
}

export function LeaveReviewDialog({
  open,
  onClose,
  onSuccess,
  leave,
  mode,
}: LeaveReviewDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewRemark, setReviewRemark] = useState("");

  useEffect(() => {
    if (open) {
      setReviewRemark("");
    }
  }, [open]);

  if (!leave) return null;

  const handleSubmit = async () => {
    if (mode === "view") {
      onClose();
      return;
    }

    if (mode === "reject" && !reviewRemark.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = mode === "approve" ? "/approve" : "/reject";
      const response = await fetch(`/api/leaves/${leave.id}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_remark: reviewRemark }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "操作失败");
      }

      onSuccess();
      onClose();
      setReviewRemark("");
    } catch (error) {
      console.error("Review leave error:", error);
      alert(error instanceof Error ? error.message : "操作失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "approve":
        return "批准请假";
      case "reject":
        return "拒绝请假";
      case "view":
        return "请假详情";
    }
  };

  const getSubmitText = () => {
    switch (mode) {
      case "approve":
        return "批准";
      case "reject":
        return "拒绝";
      case "view":
        return "关闭";
    }
  };

  const getSubmitVariant = () => {
    switch (mode) {
      case "approve":
        return "default" as const;
      case "reject":
        return "destructive" as const;
      case "view":
        return "outline" as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "approve" && <CheckCircle className="h-5 w-5 text-green-600" />}
            {mode === "reject" && <AlertCircle className="h-5 w-5 text-destructive" />}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {mode === "view"
              ? "查看请假记录详细信息"
              : mode === "approve"
              ? "确认批准此请假申请"
              : "拒绝此请假申请并说明原因"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 学生信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">学生姓名</Label>
              <p className="font-medium">{leave.student_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">学号</Label>
              <p className="font-medium">{leave.student_no}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">班级</Label>
              <p className="font-medium">{leave.class_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">学期</Label>
              <p className="font-medium">{leave.semester_name}</p>
            </div>
          </div>

          {/* 请假信息 */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">请假信息</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">开始日期</Label>
                <p className="font-medium">{formatDate(leave.start_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">结束日期</Label>
                <p className="font-medium">{formatDate(leave.end_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">请假天数</Label>
                <p className="font-medium">{leave.leave_days} 天</p>
              </div>
              <div>
                <Label className="text-muted-foreground">退费金额</Label>
                <p className="font-medium">
                  {leave.is_refund === 1 && leave.refund_amount ? (
                    <span className="text-green-600">{formatCurrency(leave.refund_amount)}</span>
                  ) : leave.is_nutrition_meal === 1 ? (
                    <span className="text-orange-600">营养餐学生不退费</span>
                  ) : (
                    <span className="text-muted-foreground">无</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-muted-foreground">请假事由</Label>
              <p className="font-medium mt-1">{leave.reason}</p>
            </div>
          </div>

          {/* 申请人信息 */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">申请信息</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">申请人</Label>
                <p className="font-medium">{leave.applicant_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">申请时间</Label>
                <p className="font-medium">{formatDate(leave.created_at, "yyyy-MM-dd HH:mm")}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">当前状态</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      leave.status === "approved"
                        ? "default"
                        : leave.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {leave.status === "pending"
                      ? "待审核"
                      : leave.status === "approved"
                      ? "已批准"
                      : "已拒绝"}
                  </Badge>
                </div>
              </div>
              {leave.reviewer_name && (
                <div>
                  <Label className="text-muted-foreground">审核人</Label>
                  <p className="font-medium">{leave.reviewer_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* 已审核的备注 */}
          {mode === "view" && leave.review_remark && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">审核备注</h4>
              <p className="text-sm bg-muted p-3 rounded-md">{leave.review_remark}</p>
            </div>
          )}

          {/* 审核备注输入 */}
          {mode === "reject" && (
            <div className="border-t pt-4">
              <Label htmlFor="remark">
                拒绝原因 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="remark"
                placeholder="请输入拒绝原因"
                value={reviewRemark}
                onChange={(e) => setReviewRemark(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="button"
            variant={getSubmitVariant()}
            onClick={handleSubmit}
            disabled={isSubmitting || (mode === "reject" && !reviewRemark.trim())}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getSubmitText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
