"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { Grade } from "@/types";
import { Button } from "@/components/ui/button";
import { GradeForm } from "@/components/admin/GradeForm";
import { GradeTable } from "@/components/admin/GradeTable";

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | undefined>();

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/grades");
      const data = await response.json();
      setGrades(data.data || []);
    } catch (error) {
      console.error("Fetch grades error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

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
          <Button variant="outline" size="icon" onClick={fetchGrades} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增年级
          </Button>
        </div>
      </div>

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
