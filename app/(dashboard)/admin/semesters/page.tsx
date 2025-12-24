"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { Semester } from "@/types";
import { Button } from "@/components/ui/button";
import { SemesterForm } from "@/components/admin/SemesterForm";
import { SemesterTable } from "@/components/admin/SemesterTable";

export default function SemestersPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | undefined>();

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      setSemesters(data.data || []);
    } catch (error) {
      console.error("Fetch semesters error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const handleEdit = (semester: Semester) => {
    setEditingSemester(semester);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingSemester(undefined);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingSemester(undefined);
  };

  const handleFormSuccess = () => {
    fetchSemesters();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">学期管理</h1>
          <p className="text-muted-foreground">管理系统学期信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchSemesters} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增学期
          </Button>
        </div>
      </div>

      <SemesterTable
        data={semesters}
        onEdit={handleEdit}
        onDelete={fetchSemesters}
        onRefresh={fetchSemesters}
      />

      <SemesterForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        semester={editingSemester}
      />
    </div>
  );
}
