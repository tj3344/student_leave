"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Search, Bell } from "lucide-react";
import dynamic from "next/dynamic";
import type { NotificationBatch, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOTIFICATION_TYPE_NAMES } from "@/lib/constants";

// 懒加载组件
const NotificationSendDialog = dynamic(
  () =>
    import("@/components/admin/NotificationSendDialog").then(
      (m) => ({ default: m.NotificationSendDialog })
    ),
  { ssr: false }
);

const NotificationBatchCard = dynamic(
  () =>
    import("@/components/admin/NotificationBatchCard").then(
      (m) => ({ default: m.NotificationBatchCard })
    ),
  { ssr: false }
);

export default function NotificationsPage() {
  const [batches, setBatches] = useState<NotificationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (typeFilter) params.append("type", typeFilter);
      params.append("page", page.toString());
      params.append("limit", pagination.limit.toString());
      params.append("sort", "created_at");
      params.append("order", "desc");

      // 使用管理员发送通知批次列表 API
      const response = await fetch(`/api/admin/sent-notifications?${params.toString()}`);
      const data: PaginatedResponse<NotificationBatch> = await response.json();

      setBatches(data.data || []);
      setPagination({
        page: data.page || 1,
        limit: data.limit || 20,
        total: data.total || 0,
        totalPages: data.totalPages || 0,
      });
    } catch (error) {
      console.error("Fetch notifications error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, [searchQuery, typeFilter]);

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDialogSuccess = () => {
    fetchNotifications(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchNotifications(newPage);
    }
  };

  return (
    <div className="space-y-4">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            通知管理
          </h1>
          <p className="text-muted-foreground mt-1">
            查看和管理发送给班主任的通知 · 共 {pagination.total} 条批次
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          发送通知
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
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
        <Button variant="outline" size="icon" onClick={() => fetchNotifications(1)}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 通知批次列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">暂无通知</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery || typeFilter ? "没有找到符合条件的通知" : "点击上方按钮发送第一条通知"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <NotificationBatchCard
              key={batch.batch_id}
              batch={batch}
              onRefresh={() => fetchNotifications(pagination.page)}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 发送通知对话框 */}
      <NotificationSendDialog open={dialogOpen} onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
    </div>
  );
}
