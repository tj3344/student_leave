"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import type { Grade } from "@/types";
import { Button } from "@/components/ui/button";
import { GradeForm } from "@/components/admin/GradeForm";
import { GradeTable } from "@/components/admin/GradeTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | undefined>();
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);

  const fetchGrades = async () => {
    setLoading(true);
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
    }
  }, [currentSemesterId]);

  const handleEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingGrade(undefined);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingGrade(undefined);
  };

  const handleFormSuccess = () => {
    fetchGrades();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">年级管理</h1>
          <p className="text-muted-foreground">管理系统年级信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchGrades} disabled={loading || !currentSemesterId}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAdd} disabled={!currentSemesterId}>
            <Plus className="mr-2 h-4 w-4" />
            新增年级
          </Button>
        </div>
      </div>

      {/* 无当前学期提示 */}
      {!currentSemesterId && !semesterLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>未设置当前学期</AlertTitle>
          <AlertDescription>
            请先在学期管理中设置一个当前学期。
          </AlertDescription>
        </Alert>
      )}

      <GradeTable data={grades} onEdit={handleEdit} onDelete={fetchGrades} />

      <GradeForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        grade={editingGrade}
      />
    </div>
  );
}
