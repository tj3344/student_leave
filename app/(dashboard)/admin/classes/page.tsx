"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Download, Upload, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import type { ClassWithDetails, Grade } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 懒加载组件
const ClassForm = dynamic(() => import("@/components/admin/ClassForm").then(m => ({ default: m.ClassForm })), {
  ssr: false,
});
const ClassTable = dynamic(() => import("@/components/admin/ClassTable").then(m => ({ default: m.ClassTable })), {
  ssr: false,
});
const ClassImportDialog = dynamic(() => import("@/components/admin/ClassImportDialog").then(m => ({ default: m.ClassImportDialog })), {
  ssr: false,
});

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithDetails | undefined>();
  const [selectedGrade, setSelectedGrade] = useState<number | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);

  const fetchGrades = async () => {
    try {
      const params = new URLSearchParams();
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
      }
      const response = await fetch(`/api/grades?${params.toString()}`);
      const data = await response.json();
      setGrades(data.data || []);
    } catch (error) {
      console.error("Fetch grades error:", error);
    }
  };

  const fetchClasses = async (gradeId?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gradeId) {
        params.append("grade_id", gradeId.toString());
      }
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
      }
      const response = await fetch(`/api/classes?${params.toString()}`);
      const data = await response.json();
      setClasses(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      const currentSemester = data.data?.find((s: { is_current: boolean }) => s.is_current === true);
      if (currentSemester) {
        setCurrentSemesterId(currentSemester.id);
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
      fetchClasses();
    }
  }, [currentSemesterId]);

  useEffect(() => {
    if (currentSemesterId) {
      fetchClasses(selectedGrade);
    }
  }, [selectedGrade, currentSemesterId]);

  const handleEdit = (classItem: ClassWithDetails) => {
    setEditingClass(classItem);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingClass(undefined);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingClass(undefined);
  };

  const handleFormSuccess = () => {
    fetchClasses(selectedGrade);
  };

  const handleExport = async () => {
    if (!currentSemesterId) return;

    try {
      const params = new URLSearchParams();
      if (selectedGrade) {
        params.append("grade_id", selectedGrade.toString());
      }
      params.append("semester_id", currentSemesterId.toString());

      const response = await fetch(`/api/classes/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `班级列表_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">班级管理</h1>
          <p className="text-muted-foreground">管理系统班级信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => currentSemesterId && fetchClasses(selectedGrade)} disabled={loading}>
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
            新增班级
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">筛选年级：</span>
              <Select
                value={selectedGrade?.toString() || "all"}
                onValueChange={(v) => setSelectedGrade(v === "all" ? undefined : parseInt(v, 10))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="全部年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部年级</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id.toString()}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ClassTable data={classes} onEdit={handleEdit} onDelete={handleFormSuccess} />

          <ClassForm
            open={formOpen}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
            classData={editingClass}
          />

          <ClassImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            onSuccess={() => fetchClasses(selectedGrade)}
          />
        </>
      )}
    </div>
  );
}
