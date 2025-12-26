"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, Download } from "lucide-react";
import type { StudentWithDetails, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentTable } from "@/components/admin/StudentTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClassTeacherStudentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classInfo, setClassInfo] = useState<{ id: number; name: string; grade_name: string } | null>(null);

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok) {
          const user = data.user as User;
          setCurrentUser(user);

          // 检查角色，必须是班主任
          if (user.role !== "class_teacher") {
            router.push("/leaves");
            return;
          }

          // 获取班主任管理的班级信息
          fetchClassInfo();
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Fetch user error:", error);
        router.push("/login");
      }
    };
    fetchCurrentUser();
  }, [router]);

  // 获取班主任管理的班级信息
  const fetchClassInfo = async () => {
    try {
      const response = await fetch("/api/class-teacher/class");
      const data = await response.json();
      if (response.ok && data.data) {
        setClassInfo(data.data);
      }
    } catch (error) {
      console.error("Fetch class info error:", error);
    }
  };

  const fetchStudents = async () => {
    if (!classInfo) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("is_active", statusFilter);
      // 强制只获取本班学生
      params.append("class_id", classInfo.id.toString());

      const response = await fetch(`/api/students?${params.toString()}`);
      const data = await response.json();
      setStudents(data.data || []);
    } catch (error) {
      console.error("Fetch students error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classInfo) {
      fetchStudents();
    }
  }, [classInfo, searchQuery, statusFilter]);

  // 导出学生列表
  const handleExport = async () => {
    if (!classInfo) return;

    try {
      const params = new URLSearchParams();
      params.append("class_id", classInfo.id.toString());
      if (statusFilter) params.append("is_active", statusFilter);

      const response = await fetch(`/api/students/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `students_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出失败:", error);
      alert("导出失败，请稍后重试");
    }
  };

  if (!currentUser || !classInfo) {
    return <div>加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">班级学生管理</h1>
          <p className="text-muted-foreground">
            查看 {classInfo.grade_name} {classInfo.name} 的学生档案
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchStudents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索学号、姓名或家长手机号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="1">在校</SelectItem>
            <SelectItem value="0">离校</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <StudentTable
        data={students}
        onEdit={() => {
          /* 班主任只能查看，不能编辑 */
        }}
        onRefresh={fetchStudents}
      />
    </div>
  );
}
