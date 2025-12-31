"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Plug, Unplug, RefreshCw, Edit, Trash2, Power } from "lucide-react";
import type { DatabaseConnectionWithDetails } from "@/types";
import { AddConnectionDialog } from "./AddConnectionDialog";
import { SwitchDatabaseDialog } from "./SwitchDatabaseDialog";

export function DatabaseConnectionsList() {
  const [connections, setConnections] = useState<DatabaseConnectionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState<number | null>(null);

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/database/connections");
      const data = await res.json();
      if (data.success) {
        setConnections(data.data);
      }
    } catch (error) {
      console.error("获取数据库连接失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleTestConnection = async (id: number) => {
    try {
      const res = await fetch(`/api/database/connections/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message);
      fetchConnections();
    } catch (error) {
      alert("测试连接失败");
    }
  };

  const handleDeleteConnection = async (id: number) => {
    if (!confirm("确定要删除此数据库连接吗？")) {
      return;
    }

    try {
      const res = await fetch(`/api/database/connections/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("删除成功");
        fetchConnections();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      alert("删除失败");
    }
  };

  const getEnvironmentBadge = (environment: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      production: "destructive",
      staging: "default",
      development: "secondary",
    };
    const names: Record<string, string> = {
      production: "生产",
      staging: "测试",
      development: "开发",
    };
    return (
      <Badge variant={variants[environment] || "secondary"}>
        {names[environment] || environment}
      </Badge>
    );
  };

  const getTestStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><Plug className="w-3 h-3 mr-1" />成功</Badge>;
      case "failed":
        return <Badge variant="destructive"><Unplug className="w-3 h-3 mr-1" />失败</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">数据库连接列表</h3>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          添加连接
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            暂无数据库连接配置
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <Card key={conn.id} className={conn.is_active ? "border-green-500" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{conn.name}</h4>
                      {getEnvironmentBadge(conn.environment)}
                      {conn.is_active && (
                        <Badge className="bg-green-500">
                          <Power className="w-3 h-3 mr-1" />
                          当前活动
                        </Badge>
                      )}
                      {getTestStatusBadge(conn.connection_test_status)}
                    </div>
                    {conn.description && (
                      <p className="text-sm text-muted-foreground mb-2">{conn.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>创建时间: {new Date(conn.created_at).toLocaleString("zh-CN")}</div>
                      {conn.last_switched_at && (
                        <div>最后切换: {new Date(conn.last_switched_at).toLocaleString("zh-CN")}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(conn.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      测试
                    </Button>
                    {!conn.is_active && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowSwitchDialog(conn.id)}
                      >
                        <Power className="w-4 h-4 mr-1" />
                        切换
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: 编辑功能 */}}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!conn.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConnection(conn.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAddDialog && (
        <AddConnectionDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={fetchConnections}
        />
      )}

      {showSwitchDialog !== null && (
        <SwitchDatabaseDialog
          connectionId={showSwitchDialog}
          open={showSwitchDialog !== null}
          onOpenChange={(open) => {
            if (!open) setShowSwitchDialog(null);
          }}
          onSuccess={fetchConnections}
        />
      )}
    </div>
  );
}
