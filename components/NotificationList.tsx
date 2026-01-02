"use client";

import { useState } from "react";
import { Check, CheckCheck, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NOTIFICATION_TYPE_NAMES, NOTIFICATION_TYPE_COLORS } from "@/lib/constants";
import type { NotificationWithDetails } from "@/types";

interface NotificationListProps {
  notifications: NotificationWithDetails[];
  loading?: boolean;
  onRefresh?: () => void;
  showSender?: boolean;
  showReceiver?: boolean;
  canDelete?: boolean;
}

export function NotificationList({
  notifications,
  loading = false,
  onRefresh,
  showSender = true,
  showReceiver = false,
  canDelete = true,
}: NotificationListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  const handleMarkAsRead = async (id: number) => {
    setMarkingReadId(id);
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
      });
      if (response.ok && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Mark as read error:", error);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/notifications/${deletingId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteDialogOpen(false);
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error("Delete notification error:", error);
    }
  };

  const getNotificationTypeName = (type: string) => {
    return NOTIFICATION_TYPE_NAMES[type] || type;
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
    <>
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`relative border rounded-lg p-4 transition-colors ${
              notification.is_read
                ? "bg-background"
                : "bg-blue-50/30 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
            }`}
          >
            {/* 未读指示器 */}
            {!notification.is_read && (
              <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-l-full"></div>
            )}

            <div className="flex items-start gap-3 pl-2">
              {/* 图标 */}
              <div
                className={`mt-1 flex-shrink-0 ${
                  notification.is_read ? "text-muted-foreground" : "text-blue-600"
                }`}
              >
                {notification.is_read ? (
                  <CheckCheck className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-medium ${notification.is_read ? "text-muted-foreground" : ""}`}
                  >
                    {notification.title}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getNotificationTypeColor(
                      notification.type
                    )}`}
                  >
                    {getNotificationTypeName(notification.type)}
                  </span>
                </div>

                <p
                  className={`text-sm mb-2 ${
                    notification.is_read ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {notification.content}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {showSender && (
                    <span>
                      发送人：{notification.sender_real_name || notification.sender_name || "系统"}
                    </span>
                  )}
                  {showReceiver && (
                    <span>
                      接收人：{notification.receiver_real_name || notification.receiver_name}
                    </span>
                  )}
                  <span>{formatDate(notification.created_at)}</span>
                  {notification.is_read && notification.read_at && (
                    <span>已读于 {formatDate(notification.read_at)}</span>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={markingReadId === notification.id}
                  >
                    {markingReadId === notification.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(notification.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条通知吗？删除后将无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
