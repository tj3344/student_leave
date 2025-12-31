"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "lucide-react";
import { DatabaseStatusPanel } from "./DatabaseStatusPanel";
import { DatabaseConnectionsList } from "./DatabaseConnectionsList";
import { DatabaseSwitchHistory } from "./DatabaseSwitchHistory";

export function DatabaseManagementCard() {
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">当前状态</TabsTrigger>
            <TabsTrigger value="connections">连接管理</TabsTrigger>
            <TabsTrigger value="history">切换历史</TabsTrigger>
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
