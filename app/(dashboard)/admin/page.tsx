"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  AlertCircle,
  DollarSign,
  RefreshCw,
  ArrowRight,
  ClipboardList,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/StatCard";
import type { DashboardStats } from "@/types";
import type { User } from "@/types";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "获取统计数据失败");
      }
      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      console.error("Fetch stats error:", err);
      setError(err instanceof Error ? err.message : "获取统计数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 检查用户角色并重定向
    const checkUserAndRedirect = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const result = await response.json();
          const user = result.user as Omit<User, "password_hash">;

          // 根据角色重定向
          if (user.role === "class_teacher") {
            router.push("/class-teacher");
            return;
          }
          if (user.role === "teacher") {
            router.push("/leaves");
            return;
          }

          // 确认是管理员后，获取统计数据
          if (user.role === "admin") {
            setRoleChecked(true);
            fetchStats();
            return;
          }
        }

        // 未登录或其他情况，重定向到登录页
        router.push("/login");
      } catch (err) {
        console.error("Check user error:", err);
        // 检查失败，重定向到登录页
        router.push("/login");
      }
    };

    checkUserAndRedirect();
  }, [router]);

  // 角色检查期间显示加载状态
  if (!roleChecked) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">管理后台</h1>
          <p className="text-muted-foreground">欢迎使用学生请假管理系统</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">管理后台</h1>
          <p className="text-muted-foreground">欢迎使用学生请假管理系统</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">管理后台</h1>
          <p className="text-muted-foreground">欢迎使用学生请假管理系统</p>
        </div>
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-600">{error || "加载失败"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={fetchStats}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">管理后台</h1>
          <p className="text-muted-foreground">
            当前学期：{stats.semester.name}
            <span className="ml-2 text-sm">
              ({stats.semester.start_date} ~ {stats.semester.end_date})
            </span>
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 统计卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 学生统计卡片 */}
        <StatCard
          title="在籍学生"
          value={stats.students.total}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          description={`营养餐：${stats.students.nutrition_meal}人`}
        />

        {/* 请假统计卡片 */}
        <StatCard
          title="请假总数"
          value={stats.leaves.total}
          icon={Calendar}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          description={`已批准：${stats.leaves.approved}`}
        />

        {/* 待审核卡片 */}
        <StatCard
          title="待审核"
          value={stats.leaves.pending}
          icon={AlertCircle}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          valueColor="text-orange-600"
        />

        {/* 退费统计卡片 */}
        <StatCard
          title="退费总额"
          value={`¥${stats.refunds.total_refund_amount.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          description={`${stats.refunds.refund_students_count}名学生`}
        />
      </div>

      {/* 快捷入口区域 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 数据管理 */}
        <Card>
          <CardHeader>
            <CardTitle>数据管理</CardTitle>
            <CardDescription>管理系统基础数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/students" prefetch={false}>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  学生管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/leaves" prefetch={false}>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  请假管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 系统管理 */}
        <Card>
          <CardHeader>
            <CardTitle>系统管理</CardTitle>
            <CardDescription>用户和系统设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users" prefetch={false}>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  用户管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/settings" prefetch={false}>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  系统设置
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
