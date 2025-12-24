import Link from "next/link";
import {
  Users,
  Calendar,
  GraduationCap,
  School,
  ClipboardList,
  ArrowRight,
  Settings,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">管理后台</h1>
        <p className="text-muted-foreground">欢迎使用学生请假管理系统</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学期管理</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">设置</div>
            <p className="text-xs text-muted-foreground">管理学期信息</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年级班级</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">基础</div>
            <p className="text-xs text-muted-foreground">管理年级和班级</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学生档案</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">管理</div>
            <p className="text-xs text-muted-foreground">学生信息维护</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">请假审核</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">处理</div>
            <p className="text-xs text-muted-foreground">审核请假申请</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>数据管理</CardTitle>
            <CardDescription>管理系统基础数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/semesters">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  学期管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/grades">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  年级管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/classes">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <School className="h-4 w-4" />
                  班级管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/students">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  学生管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/teachers">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  教师管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统管理</CardTitle>
            <CardDescription>用户和系统设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  用户管理
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled>
                请假管理
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                退费管理
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled>
                数据导入
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                数据导出
              </Button>
            </div>
            <Button variant="outline" className="w-full justify-between" disabled>
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                系统设置
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
