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

interface ConnectionFields {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

export function AddConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddConnectionDialogProps) {
  const [name, setName] = useState("");
  const [connectionFields, setConnectionFields] = useState<ConnectionFields>({
    host: "127.0.0.1",
    port: "5432",
    database: "",
    username: "",
    password: "",
  });
  const [environment, setEnvironment] = useState<DatabaseEnvironment>("development");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildConnectionString = (): string => {
    return `postgresql://${connectionFields.username}:${connectionFields.password}@${connectionFields.host}:${connectionFields.port}/${connectionFields.database}`;
  };

  const handleSubmit = async () => {
    if (!name || !connectionFields.host || !connectionFields.database || !connectionFields.username || !connectionFields.password) {
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
          connection_string: buildConnectionString(),
          environment,
          description,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("创建成功");
        onOpenChange(false);
        setName("");
        setConnectionFields({
          host: "127.0.0.1",
          port: "5432",
          database: "",
          username: "",
          password: "",
        });
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">
                主机地址 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="host"
                placeholder="127.0.0.1"
                value={connectionFields.host}
                onChange={(e) => setConnectionFields({ ...connectionFields, host: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">
                端口 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="port"
                type="number"
                placeholder="5432"
                value={connectionFields.port}
                onChange={(e) => setConnectionFields({ ...connectionFields, port: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">
              数据库名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="database"
              placeholder="student_leave"
              value={connectionFields.database}
              onChange={(e) => setConnectionFields({ ...connectionFields, database: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">
              用户名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              placeholder="postgres"
              value={connectionFields.username}
              onChange={(e) => setConnectionFields({ ...connectionFields, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              密码 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={connectionFields.password}
              onChange={(e) => setConnectionFields({ ...connectionFields, password: e.target.value })}
            />
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
