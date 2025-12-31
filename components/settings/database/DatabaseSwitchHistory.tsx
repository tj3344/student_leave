"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DatabaseSwitchHistoryWithDetails } from "@/types";

export function DatabaseSwitchHistory() {
  const [history, setHistory] = useState<DatabaseSwitchHistoryWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/database/history?page=1&limit=10");
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error("获取切换历史失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">成功</Badge>;
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
      case "rollback":
        return <Badge className="bg-yellow-500">回滚</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSwitchTypeBadge = (type: string) => {
    switch (type) {
      case "switch":
        return <Badge variant="outline">切换</Badge>;
      case "rollback":
        return <Badge variant="secondary">回滚</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">切换历史</h3>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            暂无切换历史记录
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSwitchTypeBadge(record.switch_type)}
                    {getStatusBadge(record.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(record.created_at).toLocaleString("zh-CN")}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">源:</span>
                    <span className="font-medium">
                      {record.from_connection_name || "无"}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">目标:</span>
                    <span className="font-medium">
                      {record.to_connection_name || "未知"}
                    </span>
                  </div>

                  {record.switched_by_name && (
                    <div className="text-muted-foreground">
                      操作人: {record.switched_by_name}
                    </div>
                  )}

                  {record.completed_at && (
                    <div className="text-xs text-muted-foreground">
                      耗时: {Math.round(
                        (new Date(record.completed_at).getTime() -
                          new Date(record.created_at).getTime()) / 1000
                      )} 秒
                    </div>
                  )}

                  {record.error_message && (
                    <div className="text-destructive text-xs mt-2">
                      错误: {record.error_message}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
