"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Search, GraduationCap } from "lucide-react";
import type { TeacherWithClass } from "@/lib/api/teachers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeacherForm } from "@/components/admin/TeacherForm";
import { TeacherTable } from "@/components/admin/TeacherTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEACHER_ROLE_NAMES: Record<string, string> = {
  teacher: "教师",
  class_teacher: "班主任",
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithClass | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasClassFilter, setHasClassFilter] = useState("");

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("is_active", statusFilter);
      if (hasClassFilter) params.append("has_class", hasClassFilter);

      const response = await fetch(`/api/teachers?${params.toString()}`);
      const data = await response.json();
      setTeachers(data.data || []);
    } catch (error) {
      console.error("Fetch teachers error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [searchQuery, roleFilter, statusFilter, hasClassFilter]);

  const handleEdit = (teacher: TeacherWithClass) => {
    setEditingTeacher(teacher);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingTeacher(undefined);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTeacher(undefined);
  };

  const handleFormSuccess = () => {
    fetchTeachers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">教师管理</h1>
          <p className="text-muted-foreground">管理教师和班主任账号</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchTeachers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增教师
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索用户名、姓名或手机号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {Object.entries(TEACHER_ROLE_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hasClassFilter || "all"} onValueChange={(v) => setHasClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="班级分配" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="true">已分配班级</SelectItem>
            <SelectItem value="false">未分配班级</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="1">启用</SelectItem>
            <SelectItem value="0">禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TeacherTable data={teachers} onEdit={handleEdit} onRefresh={fetchTeachers} />

      <TeacherForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        teacher={editingTeacher}
      />
    </div>
  );
}
