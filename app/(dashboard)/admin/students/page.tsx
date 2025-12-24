"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import type { StudentWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentForm } from "@/components/admin/StudentForm";
import { StudentTable } from "@/components/admin/StudentTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithDetails | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classList, setClassList] = useState<Array<{ id: number; name: string; grade_name: string; grade_id: number }>>([]);
  const [gradeList, setGradeList] = useState<Array<{ id: number; name: string }>>([]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (classFilter) params.append("class_id", classFilter);
      if (gradeFilter) params.append("grade_id", gradeFilter);
      if (statusFilter) params.append("is_active", statusFilter);

      const response = await fetch(`/api/students?${params.toString()}`);
      const data = await response.json();
      setStudents(data.data || []);
    } catch (error) {
      console.error("Fetch students error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await fetch("/api/grades");
      const data = await response.json();
      setGradeList(data.data || []);
    } catch (error) {
      console.error("Fetch grades error:", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes");
      const data = await response.json();
      setClassList(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchGrades();
    fetchClasses();
  }, [searchQuery, classFilter, gradeFilter, statusFilter]);

  const handleEdit = (student: StudentWithDetails) => {
    setEditingStudent(student);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingStudent(undefined);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingStudent(undefined);
  };

  const handleFormSuccess = () => {
    fetchStudents();
  };

  // 获取筛选后的班级列表（根据年级筛选）
  const filteredClassList = gradeFilter
    ? classList.filter((c) => c.grade_id === parseInt(gradeFilter, 10))
    : classList;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">学生管理</h1>
          <p className="text-muted-foreground">管理学生档案信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchStudents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增学生
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
        <Select value={gradeFilter || "all"} onValueChange={(value) => {
          setGradeFilter(value === "all" ? "" : value);
          setClassFilter(""); // 重置班级筛选
        }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择年级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部年级</SelectItem>
            {gradeList.map((grade) => (
              <SelectItem key={grade.id} value={grade.id.toString()}>
                {grade.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择班级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部班级</SelectItem>
            {filteredClassList.map((cls) => (
              <SelectItem key={cls.id} value={cls.id.toString()}>
                {cls.grade_name} - {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <StudentTable data={students} onEdit={handleEdit} onRefresh={fetchStudents} />

      <StudentForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        student={editingStudent}
      />
    </div>
  );
}
