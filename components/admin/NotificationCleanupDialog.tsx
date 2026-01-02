"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface NotificationCleanupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NotificationCleanupDialog({
  open,
  onClose,
  onSuccess,
}: NotificationCleanupDialogProps) {
  const [cleanupType, setCleanupType] = useState<"read" | "old" | "all">("read");
  const [daysOld, setDaysOld] = useState("30");
  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const response = await fetch("/api/admin/notifications/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: cleanupType,
          daysOld: cleanupType === "old" ? parseInt(daysOld) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || "清理失败");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      alert("清理失败");
    } finally {
      setCleaning(false);
    }
  };

  const getDescription = () => {
    switch (cleanupType) {
      case "read":
        return "将删除所有接收者都已读的通知批次。如果某个批次中有任何班主任未读，该批次将被保留。";
      case "old":
        return `将删除 ${daysOld} 天前所有接收者都已读的通知批次。如果某个批次中有任何班主任未读，该批次将被保留。`;
      case "all":
        return "⚠️ 危险操作！将删除所有通知记录（包括已读和未读）。";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            清理通知
          </DialogTitle>
          <DialogDescription>
            选择清理方式来删除不需要的通知记录
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 清理类型选择 */}
          <div className="space-y-2">
            <Label>清理类型</Label>
            <Select value={cleanupType} onValueChange={(v: any) => setCleanupType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">
                  清理已读通知（推荐）
                </SelectItem>
                <SelectItem value="old">
                  清理指定天数前的已读通知
                </SelectItem>
                <SelectItem value="all">
                  清理所有通知（危险）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 天数输入（仅当选择 old 类型时显示） */}
          {cleanupType === "old" && (
            <div className="space-y-2">
              <Label>天数</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={daysOld}
                onChange={(e) => setDaysOld(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                删除 {daysOld} 天前创建的已读通知
              </p>
            </div>
          )}

          {/* 警告提示 */}
          <div className={`flex gap-3 p-3 rounded-lg ${
            cleanupType === "all"
              ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
              : "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
          }`}>
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
              cleanupType === "all" ? "text-red-600" : "text-yellow-600"
            }`} />
            <div className="text-sm">
              <div className={`font-medium mb-1 ${
                cleanupType === "all" ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"
              }`}>
                {cleanupType === "all" ? "警告" : "注意"}
              </div>
              <div className={cleanupType === "all" ? "text-red-600 dark:text-red-400" : "text-yellow-700 dark:text-yellow-600"}>
                {getDescription()}
              </div>
              {cleanupType === "all" && (
                <div className="text-red-600 dark:text-red-400 mt-2 font-medium">
                  此操作不可恢复，请谨慎操作！
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cleaning}>
            取消
          </Button>
          <Button
            variant={cleanupType === "all" ? "destructive" : "default"}
            onClick={handleCleanup}
            disabled={cleaning}
          >
            {cleaning ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                清理中...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                确认清理
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
