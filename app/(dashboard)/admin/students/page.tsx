"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Search, Upload, Download, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import type { StudentWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 懒加载组件
const StudentForm = dynamic(() => import("@/components/admin/StudentForm").then(m => ({ default: m.StudentForm })), {
  ssr: false,
});
const StudentTable = dynamic(() => import("@/components/admin/StudentTable").then(m => ({ default: m.StudentTable })), {
  ssr: false,
});
const StudentImportDialog = dynamic(() => import("@/components/admin/StudentImportDialog").then(m => ({ default: m.StudentImportDialog })), {
  ssr: false,
});

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithDetails | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [classList, setClassList] = useState<Array<{ id: number; name: string; grade_name: string; grade_id: number }>>([]);
  const [gradeList, setGradeList] = useState<Array<{ id: number; name: string }>>([]);
  const [currentSemester, setCurrentSemester] = useState<{ id: number; name: string } | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (classFilter) params.append("class_id", classFilter);
      if (gradeFilter) params.append("grade_id", gradeFilter);
      if (statusFilter) params.append("is_active", statusFilter);
      if (currentSemesterId) params.append("semester_id", currentSemesterId.toString());

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
      const params = new URLSearchParams();
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
      }
      const response = await fetch(`/api/grades?${params.toString()}`);
      const data = await response.json();
      setGradeList(data.data || []);
    } catch (error) {
      console.error("Fetch grades error:", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams();
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
      }
      const response = await fetch(`/api/classes?${params.toString()}`);
      const data = await response.json();
      setClassList(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      const semester = data.data?.find((s: { is_current: boolean }) => s.is_current === true);
      if (semester) {
        setCurrentSemesterId(semester.id);
        setCurrentSemester({ id: semester.id, name: semester.name });
      }
    } catch (error) {
      console.error("获取当前学期失败:", error);
    } finally {
      setSemesterLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentSemester();
  }, []);

  useEffect(() => {
    if (currentSemesterId) {
      fetchGrades();
      fetchStudents();
      fetchClasses();
    }
  }, [searchQuery, classFilter, gradeFilter, statusFilter, currentSemesterId]);

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

  // 导出学生列表
  const handleExport = async () => {
    if (!currentSemesterId) return;

    try {
      const params = new URLSearchParams();
      if (classFilter) params.append("class_id", classFilter);
      if (gradeFilter) params.append("grade_id", gradeFilter);
      if (statusFilter) params.append("is_active", statusFilter);
      params.append("semester_id", currentSemesterId.toString());

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
        {currentSemester && (
          <div className="bg-primary/10 text-primary-foreground px-3 py-1 rounded-md inline-block">
            <span className="font-medium">{currentSemester.name}</span>
            <span className="text-xs ml-2">（当前学期）</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => currentSemesterId && fetchStudents()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!currentSemesterId}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!currentSemesterId}>
            <Upload className="mr-2 h-4 w-4" />
            导入
          </Button>
          <Button onClick={handleAdd} disabled={!currentSemesterId}>
            <Plus className="mr-2 h-4 w-4" />
            新增学生
          </Button>
        </div>
      </div>

      {/* 无当前学期提示 */}
      {!currentSemesterId && !semesterLoading ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>未设置当前学期</AlertTitle>
          <AlertDescription>
            请先在学期管理中设置一个当前学期。
            <Button variant="outline" size="sm" className="ml-4" onClick={() => window.location.href = "/admin/semesters"}>
              前往学期管理
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
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

          <StudentImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            onSuccess={() => {
              setImportOpen(false);
              fetchStudents();
            }}
          />
        </>
      )}
    </div>
  );
}
