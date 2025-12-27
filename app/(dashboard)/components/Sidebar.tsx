"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/admin" prefetch={false} className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <School className="h-5 w-5" />
          </div>
          <span className="text-lg">学生请假管理</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((section) => {
          const filteredItems = section.items.filter((item) =>
            item.roles.includes(user.role)
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={section.category} className="mb-6">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-1">
                {filteredItems.map((item) => {
                  // 如果有其他菜单项是当前路径更长/更精确的前缀，则当前项不高亮
                  const hasMoreSpecificMatch = filteredItems.some(
                    (other) => other.href !== item.href &&
                      (pathname === other.href || pathname.startsWith(other.href + "/")) &&
                      other.href.length > item.href.length
                  );
                  const isActive = (pathname === item.href || pathname.startsWith(item.href + "/")) && !hasMoreSpecificMatch;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex cursor-pointer items-center gap-3 rounded-lg bg-accent p-3 transition-colors hover:bg-accent/80">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {user.real_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user.real_name}</p>
                <p className="truncate text-xs text-muted-foreground">{ROLE_NAMES[user.role as keyof typeof ROLE_NAMES]}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              <span>修改密码</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
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
