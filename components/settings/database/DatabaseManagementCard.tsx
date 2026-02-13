"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatabaseStatusPanel } from "./DatabaseStatusPanel";
import { DatabaseConnectionsList } from "./DatabaseConnectionsList";
import { DatabaseSwitchHistory } from "./DatabaseSwitchHistory";

export function DatabaseManagementCard() {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{
    success: boolean;
    message: string;
    details?: { clearedTables: string[]; rowsCleared: number };
  } | null>(null);

  const handleClearData = async () => {
    setClearing(true);
    try {
      const response = await fetch("/api/system/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await response.json();
      setClearResult(data);

      // Refresh page after successful clear
      if (data.success) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      console.error("清空数据失败:", error);
      setClearResult({ success: false, message: "清空数据失败" });
    } finally {
      setClearing(false);
    }
  };

  const handleCloseClearDialog = () => {
    setClearDialogOpen(false);
    setClearResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          数据库管理
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">当前状态</TabsTrigger>
            <TabsTrigger value="connections">连接管理</TabsTrigger>
            <TabsTrigger value="history">切换历史</TabsTrigger>
            <TabsTrigger value="clear-data" className="text-red-600">清空数据</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-4">
            <DatabaseStatusPanel />
          </TabsContent>

          <TabsContent value="connections" className="mt-4">
            <DatabaseConnectionsList />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <DatabaseSwitchHistory />
          </TabsContent>

          <TabsContent value="clear-data" className="mt-4">
            <div className="space-y-4">
              {/* 警告提示 */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800 dark:text-red-200">危险操作</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      此操作将清空数据库中的所有数据，但保留表结构。
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1 list-disc list-inside">
                      <li>所有学生、班级、年级、学期数据将被删除</li>
                      <li>所有请假记录将被删除</li>
                      <li>所有系统配置将被重置</li>
                      <li>所有备份记录将被删除</li>
                      <li>当前登录的管理员账户将被保留</li>
                    </ul>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mt-2">
                      此操作不可撤销！请确保已做好数据备份。
                    </p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setClearDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空所有数据
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* 确认对话框 */}
      <Dialog open={clearDialogOpen} onOpenChange={handleCloseClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              确认清空数据
            </DialogTitle>
            <DialogDescription>
              您即将清空数据库中的所有数据。此操作不可撤销！
            </DialogDescription>
          </DialogHeader>

          {!clearResult ? (
            <>
              <div className="py-4">
                <p className="text-sm font-medium mb-2">请确认以下信息：</p>
                <ul className="text-sm space-y-1">
                  <li>• 所有业务数据将被删除</li>
                  <li>• 当前登录的管理员账户将被保留</li>
                  <li>• 表结构将被保留</li>
                  <li>• 此操作不可撤销</li>
                </ul>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseClearDialog} disabled={clearing}>
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={clearing}
                >
                  {clearing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin border-2 border-transparent border-t-current" />
                      清空中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      确认清空
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className={`py-4 text-center ${
                clearResult.success ? "text-green-600" : "text-red-600"
              }`}>
                {clearResult.success ? (
                  <>
                    <div className="text-4xl font-bold">✓</div>
                    <p className="font-semibold mt-2">数据清空成功！</p>
                    {clearResult.details && (
                      <div className="mt-4 text-sm text-left bg-muted rounded-lg p-4">
                        <p className="font-medium mb-2">清空统计：</p>
                        <p>• 清空了 {clearResult.details.rowsCleared} 行数据</p>
                        <p>• 涉及 {clearResult.details.clearedTables.length} 个表</p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-primary hover:underline">
                            查看详细列表
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs">
                            {clearResult.details.clearedTables.map((table, idx) => (
                              <li key={idx}>• {table}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold">✗</div>
                    <p className="font-semibold mt-2">数据清空失败</p>
                    <p className="text-sm mt-1">{clearResult.message}</p>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCloseClearDialog}>
                  {clearResult.success ? "关闭（页面将刷新）" : "关闭"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
