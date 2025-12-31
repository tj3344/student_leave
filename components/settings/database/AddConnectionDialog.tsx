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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DatabaseEnvironment } from "@/types";

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddConnectionDialogProps) {
  const [name, setName] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [environment, setEnvironment] = useState<DatabaseEnvironment>("development");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !connectionString || !environment) {
      alert("请填写所有必填字段");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/database/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          connection_string: connectionString,
          environment,
          description,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("创建成功");
        onOpenChange(false);
        setName("");
        setConnectionString("");
        setEnvironment("development");
        setDescription("");
        onSuccess();
      } else {
        alert(data.error || "创建失败");
      }
    } catch (error) {
      alert("创建失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加数据库连接</DialogTitle>
          <DialogDescription>
            配置一个新的 PostgreSQL 数据库连接
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="如：生产数据库、测试数据库"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="connection">
              连接字符串 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="connection"
              placeholder="postgresql://user:password@host:5432/database"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              PostgreSQL 连接字符串格式：postgresql://用户名:密码@主机:端口/数据库名
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">
              环境类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={environment} onValueChange={(v: DatabaseEnvironment) => setEnvironment(v)}>
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">开发环境</SelectItem>
                <SelectItem value="staging">测试环境</SelectItem>
                <SelectItem value="production">生产环境</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Input
              id="description"
              placeholder="备注信息"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "提交中..." : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
