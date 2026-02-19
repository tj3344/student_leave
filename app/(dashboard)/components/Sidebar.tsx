"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  UserCircle,
  Calendar,
  GraduationCap,
  School,
  ClipboardList,
  Receipt,
  FileText,
  Database,
  Settings,
  LogOut,
  DollarSign,
  Home,
  KeyRound,
  ChevronUp,
  Bell,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ROLE_NAMES } from "@/lib/constants";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";

const navigation = [
  {
    category: "工作台",
    items: [
      { name: "班主任工作台", href: "/class-teacher", icon: Home, roles: ["class_teacher"] },
    ],
  },
  {
    category: "班级管理",
    items: [
      { name: "班级学生", href: "/class-teacher/students", icon: Users, roles: ["class_teacher"] },
      { name: "请假管理", href: "/class-teacher/leaves", icon: ClipboardList, roles: ["class_teacher"] },
      { name: "退费记录", href: "/class-teacher/refunds", icon: Receipt, roles: ["class_teacher"] },
      { name: "通知中心", href: "/class-teacher/notifications", icon: Bell, roles: ["class_teacher"], showBadge: true },
    ],
  },
  {
    category: "数据管理",
    items: [
      { name: "学期管理", href: "/admin/semesters", icon: Calendar, roles: ["admin"] },
      { name: "年级管理", href: "/admin/grades", icon: GraduationCap, roles: ["admin"] },
      { name: "班级管理", href: "/admin/classes", icon: School, roles: ["admin"] },
      { name: "学生管理", href: "/admin/students", icon: Users, roles: ["admin"] },
      { name: "用户管理", href: "/admin/users", icon: UserCircle, roles: ["admin"] },
    ],
  },
  {
    category: "费用管理",
    items: [
      { name: "缴费管理", href: "/admin/fees", icon: DollarSign, roles: ["admin"] },
      { name: "退费记录", href: "/admin/fees/refunds", icon: Receipt, roles: ["admin"] },
      { name: "退费汇总", href: "/admin/fees/summary", icon: FileText, roles: ["admin"] },
    ],
  },
  {
    category: "请假管理",
    items: [
      { name: "请假管理", href: "/leaves", icon: ClipboardList, roles: ["admin", "teacher"] },
      { name: "审核管理", href: "/admin/leaves/pending", icon: ClipboardList, roles: ["admin"] },
    ],
  },
  {
    category: "通知管理",
    items: [
      { name: "发送通知", href: "/admin/notifications", icon: Bell, roles: ["admin"] },
    ],
  },
  {
    category: "系统功能",
    items: [
      { name: "数据备份", href: "/admin/backup", icon: Database, roles: ["admin"] },
      { name: "系统设置", href: "/admin/settings", icon: Settings, roles: ["admin"] },
      { name: "操作日志", href: "/admin/operation-logs", icon: FileText, roles: ["admin"] },
    ],
  },
];

interface SidebarProps {
  user: { username: string; real_name: string; role: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 获取未读通知数量
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/notifications/stats");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.data?.unread || 0);
        }
      } catch (error) {
        console.error("Fetch unread count error:", error);
      }
    };

    fetchUnreadCount();

    // 每30秒刷新一次未读数量
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // 计算所有可见的菜单项（用于全局的激活状态判断）
  const allVisibleItems = navigation.flatMap(section =>
    section.items.filter(item => item.roles.includes(user.role))
  );

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-soft">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link href="/admin" prefetch={false} className="flex items-center gap-3 font-semibold transition-transform hover:scale-[1.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-soft text-primary-foreground">
            <School className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">学生请假管理</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {navigation.map((section) => {
          const filteredItems = section.items.filter((item) =>
            item.roles.includes(user.role)
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={section.category}>
              <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-1">
                {filteredItems.map((item) => {
                  // 检查是否有更具体的匹配项（在所有可见菜单项中检查，而非仅当前分类）
                  const hasMoreSpecificMatch = allVisibleItems.some(
                    (other) => other.href !== item.href &&
                      (pathname === other.href || pathname.startsWith(other.href + "/")) &&
                      other.href.length > item.href.length
                  );
                  const isActive = (pathname === item.href || pathname.startsWith(item.href + "/")) && !hasMoreSpecificMatch;
                  const Icon = item.icon;
                  const showBadge = (item as any).showBadge && unreadCount > 0;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-gradient-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-[1.01]"
                      )}
                    >
                      <div className="relative">
                        <Icon className="h-4 w-4" />
                        {showBadge && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                      </div>
                      <span className="flex-1">{item.name}</span>
                      {showBadge && (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-5 px-1 text-xs flex items-center justify-center"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-sidebar-accent p-3 shadow-soft transition-all duration-300 hover:shadow-soft-hover hover:scale-[1.01]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary shadow-soft text-primary-foreground font-semibold">
                {user.real_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user.real_name}</p>
                <p className="truncate text-xs text-muted-foreground">{ROLE_NAMES[user.role as keyof typeof ROLE_NAMES]}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-soft-lg">
            <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)} className="cursor-pointer rounded-lg">
              <KeyRound className="mr-2 h-4 w-4" />
              <span>修改密码</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer rounded-lg">
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      />
    </div>
  );
}
