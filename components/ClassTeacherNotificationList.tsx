"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Bell, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationWithDetails } from "@/types";
import { NOTIFICATION_TYPE_NAMES } from "@/lib/constants";

interface ClassTeacherNotificationListProps {
  notifications: NotificationWithDetails[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function ClassTeacherNotificationList({
  notifications,
  loading = false,
  onRefresh,
}: ClassTeacherNotificationListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 点击展开/收起并自动标记为已读
  const handleToggleExpand = async (notification: NotificationWithDetails) => {
    // 如果是未读通知，先标记为已读
    if (!notification.is_read && expandedId !== notification.id) {
      setMarkingReadId(notification.id);
      try {
        const response = await fetch(`/api/notifications/${notification.id}/read`, {
          method: "PUT",
        });
        if (response.ok && onRefresh) {
          await onRefresh();
        }
      } catch (error) {
        console.error("Mark as read error:", error);
      } finally {
        setMarkingReadId(null);
      }
    }

    // 切换展开状态
    setExpandedId(expandedId === notification.id ? null : notification.id);
  };

  // 删除通知
  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条通知吗？")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (response.ok && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Delete notification error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getNotificationTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      system: "bg-blue-100 text-blue-800",
      announcement: "bg-gray-100 text-gray-800",
      reminder: "bg-yellow-100 text-yellow-800",
      warning: "bg-red-100 text-red-800",
    };
    return colorMap[type] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">暂无通知</h3>
        <p className="mt-2 text-sm text-muted-foreground">当前没有收到任何通知</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => {
        const isExpanded = expandedId === notification.id;
        const isProcessing = markingReadId === notification.id || deletingId === notification.id;

        return (
          <div
            key={notification.id}
            className={`relative border rounded-lg transition-all duration-200 overflow-hidden ${
              notification.is_read
                ? "bg-background"
                : "bg-blue-50/30 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
            }`}
          >
            {/* 未读指示器 */}
            {!notification.is_read && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            )}

            {/* 点击区域 - 始终显示 */}
            <div
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors pl-6"
              onClick={() => handleToggleExpand(notification)}
            >
              <div className="flex items-center gap-3">
                {/* 展开/收起图标 */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* 通知图标 */}
                <div className="flex-shrink-0">
                  {notification.is_read ? (
                    <CheckCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <Bell className="h-5 w-5 text-blue-600" />
                  )}
                </div>

                {/* 标题和类型 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-medium truncate ${
                        notification.is_read ? "text-foreground" : "text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {notification.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getNotificationTypeColor(
                        notification.type
                      )}`}
                    >
                      {NOTIFICATION_TYPE_NAMES[notification.type] || notification.type}
                    </span>
                    {!notification.is_read && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex-shrink-0">
                        新
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3">
                    <span>{notification.sender_real_name || notification.sender_name || "系统"}</span>
                    <span>·</span>
                    <span>{formatDate(notification.created_at)}</span>
                  </div>
                </div>

                {/* 删除按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* 展开内容 - 点击后显示 */}
            {isExpanded && (
              <div className="border-t bg-muted/30 p-4 pl-6">
                <div className="text-sm mb-3 whitespace-pre-wrap">{notification.content}</div>
                {notification.is_read && notification.read_at && (
                  <div className="text-xs text-muted-foreground">
                    已读于 {formatDate(notification.read_at)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
