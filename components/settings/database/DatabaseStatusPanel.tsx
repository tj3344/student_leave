"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { DatabaseStatus } from "@/types";

export function DatabaseStatusPanel() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/database/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("获取数据库状态失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusIcon = () => {
    if (!status) return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    switch (status.status) {
      case "connected":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "disconnected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "maintenance":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    if (!status) return <Badge variant="secondary">未知</Badge>;
    switch (status.status) {
      case "connected":
        return <Badge className="bg-green-500">已连接</Badge>;
      case "disconnected":
        return <Badge variant="destructive">未连接</Badge>;
      case "maintenance":
        return <Badge className="bg-yellow-500">维护中</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-lg">{status?.name || "正在加载..."}</h3>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              {getStatusBadge()}
              {status?.version && <span>{status.version}</span>}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {status && status.status === "connected" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">数据库大小</div>
              <div className="text-2xl font-semibold">{status.size || "未知"}</div>
            </CardContent>
          </Card>

          {status.connection_pool && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">连接池</div>
                <div className="text-2xl font-semibold">
                  {status.connection_pool.active}/{status.connection_pool.total}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {status.connection_pool.idle} 个空闲连接
                </div>
              </CardContent>
            </Card>
          )}

          {status.tables && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">数据表</div>
                <div className="text-2xl font-semibold">{status.tables.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  共 {status.tables.reduce((sum, t) => sum + t.rows, 0).toLocaleString()} 条记录
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {status?.tables && status.tables.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-4">表统计</h4>
            <div className="space-y-2">
              {status.tables.slice(0, 10).map((table) => (
                <div key={table.name} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{table.name}</span>
                  <span className="text-muted-foreground">{table.rows.toLocaleString()} 行</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
