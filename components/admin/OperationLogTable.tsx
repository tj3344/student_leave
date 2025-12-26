"use client";

import type { OperationLogWithUser } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MODULE_NAMES, ACTION_NAMES } from "@/lib/constants";

interface OperationLogTableProps {
  data: OperationLogWithUser[];
  loading?: boolean;
}

export function OperationLogTable({ data, loading }: OperationLogTableProps) {
  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case "create":
      case "approve":
        return "default";
      case "update":
        return "secondary";
      case "delete":
      case "reject":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getModuleBadgeVariant = (module: string): "default" | "secondary" | "outline" => {
    switch (module) {
      case "system":
      case "auth":
        return "default";
      case "users":
      case "students":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>操作模块</TableHead>
            <TableHead>操作类型</TableHead>
            <TableHead>描述</TableHead>
            <TableHead>IP 地址</TableHead>
            <TableHead>创建时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                {loading ? "加载中..." : "暂无操作日志"}
              </TableCell>
            </TableRow>
          ) : (
            data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">#{log.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.real_name || "未知用户"}</span>
                    <span className="text-xs text-muted-foreground">@{log.username || "未知"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getModuleBadgeVariant(log.module)}>
                    {MODULE_NAMES[log.module] || log.module}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {ACTION_NAMES[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={log.description}>
                  {log.description || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.ip_address || "-"}
                </TableCell>
                <TableCell>
                  {new Date(log.created_at).toLocaleString("zh-CN")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
