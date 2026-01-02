"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, Bell, CheckCheck, Filter } from "lucide-react";
import dynamic from "next/dynamic";
import type { NotificationWithDetails, NotificationStats } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NOTIFICATION_TYPE_NAMES } from "@/lib/constants";

// 懒加载组件
const NotificationList = dynamic(
  () => import("@/components/NotificationList").then((m) => ({ default: m.NotificationList })),
  { ssr: false }
);

export default function ClassTeacherNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: { system: 0, announcement: 0, reminder: 0, warning: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [readFilter, setReadFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取通知列表
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (typeFilter) params.append("type", typeFilter);
      if (readFilter) params.append("is_read", readFilter);
      params.append("sort", "created_at");
      params.append("order", "desc");

      const [notifResponse, statsResponse] = await Promise.all([
        fetch(`/api/notifications?${params.toString()}`),
        fetch("/api/notifications/stats"),
      ]);

      const notifData = await notifResponse.json();
      const statsData = await statsResponse.json();

      setNotifications(notifData.data || []);
      setStats(statsData.data || stats);
    } catch (error) {
      console.error("Fetch notifications error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, typeFilter, readFilter]);

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PUT",
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Mark all as read error:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          通知中心
        </h1>
        <p className="text-muted-foreground mt-1">查看管理员发送的通知信息</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">全部通知</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">未读通知</CardTitle>
            <Bell className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unread}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">公告通知</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byType.announcement}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">提醒通知</CardTitle>
            <Bell className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byType.reminder}</div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索通知标题或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="通知类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(NOTIFICATION_TYPE_NAMES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={readFilter || "all"} onValueChange={(v) => setReadFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="已读状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="false">未读</SelectItem>
              <SelectItem value="true">已读</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {stats.unread > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  标记中...
                </>
              ) : (
                <>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  全部已读
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 通知列表 */}
      <NotificationList
        notifications={notifications}
        loading={loading}
        onRefresh={fetchData}
        showSender={true}
        showReceiver={false}
        canDelete={true}
      />
    </div>
  );
}
