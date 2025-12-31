"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { DatabaseConnectionWithDetails } from "@/types";

interface SwitchDatabaseDialogProps {
  connectionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SwitchDatabaseDialog({
  connectionId,
  open,
  onOpenChange,
  onSuccess,
}: SwitchDatabaseDialogProps) {
  const [createBackup, setCreateBackup] = useState(true);
  const [validateAfterMigration, setValidateAfterMigration] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [progress, setProgress] = useState("");
  const [targetConnection, setTargetConnection] = useState<DatabaseConnectionWithDetails | null>(null);

  // 获取目标连接信息
  useState(() => {
    const fetchConnection = async () => {
      const res = await fetch(`/api/database/connections/${connectionId}`);
      const data = await res.json();
      if (data.success) {
        setTargetConnection(data.data);
      }
    };
    if (open) {
      fetchConnection();
    }
  });

  const handleSwitch = async () => {
    setIsSwitching(true);
    setProgress("正在初始化...");

    try {
      const res = await fetch(`/api/database/connections/${connectionId}/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: {
            createBackup,
            validateAfterMigration,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setProgress("切换成功！");
        setTimeout(() => {
          alert("数据库切换成功！");
          onOpenChange(false);
          onSuccess();
        }, 500);
      } else {
        setProgress(`切换失败: ${data.error}`);
        alert(data.error || "切换失败");
      }
    } catch (error) {
      setProgress("切换失败");
      alert("切换失败");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>切换数据库</DialogTitle>
          <DialogDescription>
            切换到目标数据库并迁移数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {targetConnection && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                即将切换到 <strong>{targetConnection.name}</strong>
                ({targetConnection.environment === "production" ? "生产环境" : "测试环境"})
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup"
                checked={createBackup}
                onCheckedChange={(checked) => setCreateBackup(checked as boolean)}
              />
              <Label htmlFor="backup" className="cursor-pointer">
                迁移前创建备份
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="validate"
                checked={validateAfterMigration}
                onCheckedChange={(checked) => setValidateAfterMigration(checked as boolean)}
              />
              <Label htmlFor="validate" className="cursor-pointer">
                迁移后验证数据完整性
              </Label>
            </div>
          </div>

          {isSwitching && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress || "正在切换数据库..."}
              </div>
              <p className="text-xs text-muted-foreground">
                数据库切换期间，系统将进入维护模式，请耐心等待...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSwitching}
          >
            取消
          </Button>
          <Button
            onClick={handleSwitch}
            disabled={isSwitching}
            variant={targetConnection?.environment === "production" ? "destructive" : "default"}
          >
            {isSwitching ? "切换中..." : "确认切换"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
