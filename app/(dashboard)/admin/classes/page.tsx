"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { ClassWithDetails, Grade } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClassForm } from "@/components/admin/ClassForm";
import { ClassTable } from "@/components/admin/ClassTable";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithDetails | undefined>();
  const [selectedGrade, setSelectedGrade] = useState<number | undefined>();

  const fetchGrades = async () => {
    try {
      const response = await fetch("/api/grades");
      const data = await response.json();
      setGrades(data.data || []);
    } catch (error) {
      console.error("Fetch grades error:", error);
    }
  };

  const fetchClasses = async (gradeId?: number) => {
    setLoading(true);
    try {
      const url = gradeId ? `/api/classes?grade_id=${gradeId}` : "/api/classes";
      const response = await fetch(url);
      const data = await response.json();
      setClasses(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchClasses(selectedGrade);
  }, [selectedGrade]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">班级管理</h1>
          <p className="text-muted-foreground">管理系统班级信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchClasses(selectedGrade)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增班级
          </Button>
        </div>
      </div>

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
    </div>
  );
}
