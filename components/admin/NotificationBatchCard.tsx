"use client";

import { useState } from "react";
import { Bell, CheckCheck, ChevronDown, ChevronRight, Users } from "lucide-react";
import { NOTIFICATION_TYPE_NAMES } from "@/lib/constants";
import type { NotificationBatch } from "@/types";

interface NotificationBatchCardProps {
  batch: NotificationBatch;
  onRefresh?: () => void;
}

export function NotificationBatchCard({ batch, onRefresh }: NotificationBatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const formatReadTime = (dateStr?: string) => {
    if (!dateStr) return "";
    return formatDate(dateStr);
  };

  // 计算已读进度百分比
  const readPercentage = batch.receiver_count > 0
    ? Math.round((batch.read_count / batch.receiver_count) * 100)
    : 0;

  return (
    <div className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* 头部（始终显示） */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* 展开/收起图标 */}
          <div className="flex-shrink-0 mt-1">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* 通知图标 */}
          <div className="flex-shrink-0 mt-1">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>

          {/* 主要内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium truncate">{batch.title}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getNotificationTypeColor(
                  batch.type
                )}`}
              >
                {NOTIFICATION_TYPE_NAMES[batch.type] || batch.type}
              </span>
            </div>

            <div className="text-sm text-muted-foreground mb-2">
              发送于 {formatDate(batch.created_at)}
            </div>

            {/* 接收者统计 */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {batch.receiver_count} 位班主任
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCheck className="h-4 w-4 text-green-600" />
                <span className="text-green-700 dark:text-green-400">
                  {batch.read_count} 人已读
                </span>
                {batch.receiver_count > batch.read_count && (
                  <span className="text-muted-foreground">
                    ({batch.receiver_count - batch.read_count} 人未读)
                  </span>
                )}
              </div>
              {/* 已读进度条 */}
              {batch.receiver_count > 0 && (
                <div className="flex items-center gap-2 flex-1 min-w-[100px]">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${readPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {readPercentage}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 展开内容（接收者列表） */}
      {isExpanded && (
        <div className="border-t bg-muted/30">
          {/* 通知内容 */}
          <div className="px-6 py-3 border-b">
            <div className="text-sm text-muted-foreground mb-1">通知内容：</div>
            <div className="text-sm">{batch.content}</div>
          </div>

          {/* 接收者列表 - 紧凑网格布局 */}
          <div className="px-6 py-4">
            <div className="text-sm font-medium mb-3">
              接收者列表 ({batch.receivers.length}人)：
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {batch.receivers.map((receiver) => (
                <div
                  key={receiver.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    receiver.is_read
                      ? "bg-background border-muted-foreground/20"
                      : "bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* 左侧：图标 + 教师信息 */}
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {/* 已读/未读图标 */}
                      <div className="flex-shrink-0 mt-0.5">
                        {receiver.is_read ? (
                          <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-orange-400" />
                        )}
                      </div>

                      {/* 教师信息 */}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{receiver.real_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {receiver.class_name || receiver.username}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：状态 */}
                    <div className="flex-shrink-0 text-xs">
                      {receiver.is_read ? (
                        <span className="text-green-700 dark:text-green-400 whitespace-nowrap">
                          {formatReadTime(receiver.read_at)}
                        </span>
                      ) : (
                        <span className="text-orange-700 dark:text-orange-400 font-medium whitespace-nowrap">
                          未读
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
