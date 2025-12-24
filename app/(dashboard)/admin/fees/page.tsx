"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { FeeConfigWithDetails, Semester } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeeConfigForm } from "@/components/admin/FeeConfigForm";
import { FeeConfigTable } from "@/components/admin/FeeConfigTable";

export default function FeesPage() {
  const [feeConfigs, setFeeConfigs] = useState<FeeConfigWithDetails[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFeeConfig, setEditingFeeConfig] = useState<FeeConfigWithDetails | undefined>();
  const [semesterFilter, setSemesterFilter] = useState<number>(0);

  const fetchFeeConfigs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (semesterFilter) params.append("semester_id", semesterFilter.toString());

      const response = await fetch(`/api/fee-configs?${params.toString()}`);
      const data = await response.json();
      setFeeConfigs(data.data || []);
    } catch (error) {
      console.error("Fetch fee configs error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      setSemesters(data.data || []);
    } catch (error) {
      console.error("Fetch semesters error:", error);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    fetchFeeConfigs();
  }, [semesterFilter]);

  const handleEdit = (feeConfig: FeeConfigWithDetails) => {
    setEditingFeeConfig(feeConfig);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingFeeConfig(undefined);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingFeeConfig(undefined);
  };

  const handleFormSuccess = () => {
    fetchFeeConfigs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">缴费管理</h1>
          <p className="text-muted-foreground">设置每个班级的餐费标准和相关天数</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchFeeConfigs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增配置
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={semesterFilter.toString()} onValueChange={(v) => setSemesterFilter(v === "0" ? 0 : parseInt(v, 10))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="全部学期" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">全部学期</SelectItem>
            {semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id.toString()}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FeeConfigTable data={feeConfigs} onEdit={handleEdit} onRefresh={fetchFeeConfigs} />

      <FeeConfigForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        feeConfig={editingFeeConfig}
      />
    </div>
  );
}
