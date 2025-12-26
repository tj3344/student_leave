"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  AlertCircle,
  DollarSign,
  RefreshCw,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/StatCard";
import type { ClassTeacherDashboardStats } from "@/types";

export default function ClassTeacherDashboardPage() {
  const [stats, setStats] = useState<ClassTeacherDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/class-teacher/dashboard/stats");
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
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">班主任工作台</h1>
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
          <h1 className="text-3xl font-bold">班主任工作台</h1>
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
          <h1 className="text-3xl font-bold">班主任工作台</h1>
          <p className="text-muted-foreground">
            {stats.class.grade_name} {stats.class.name}
            <span className="mx-2">|</span>
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
          title="班级学生"
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
      <div className="grid gap-4 md:grid-cols-3">
        {/* 请假管理 */}
        <Card>
          <CardHeader>
            <CardTitle>请假管理</CardTitle>
            <CardDescription>查看和管理班级学生请假记录</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/class-teacher/leaves">
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

        {/* 退费记录 */}
        <Card>
          <CardHeader>
            <CardTitle>退费记录</CardTitle>
            <CardDescription>查看班级学生退费金额</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/class-teacher/refunds">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  退费记录
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 统计说明 */}
        <Card>
          <CardHeader>
            <CardTitle>数据说明</CardTitle>
            <CardDescription>统计数据基于当前学期</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• 学生总数：本班级在籍学生人数</p>
            <p>• 营养餐：享受营养餐的学生人数</p>
            <p>• 请假统计：本学期所有请假记录</p>
            <p>• 退费统计：已批准且有退费的记录</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
