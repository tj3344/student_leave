"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Download, Upload, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import type { FeeConfigWithDetails, Semester } from "@/types";
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
const FeeConfigForm = dynamic(() => import("@/components/admin/FeeConfigForm").then(m => ({ default: m.FeeConfigForm })), {
  ssr: false,
});
const FeeConfigTable = dynamic(() => import("@/components/admin/FeeConfigTable").then(m => ({ default: m.FeeConfigTable })), {
  ssr: false,
});
const FeeConfigImportDialog = dynamic(() => import("@/components/admin/FeeConfigImportDialog").then(m => ({ default: m.FeeConfigImportDialog })), {
  ssr: false,
});

export default function FeesPage() {
  const [feeConfigs, setFeeConfigs] = useState<FeeConfigWithDetails[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingFeeConfig, setEditingFeeConfig] = useState<FeeConfigWithDetails | undefined>();
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);

  const fetchFeeConfigs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentSemesterId) params.append("semester_id", currentSemesterId.toString());

      const response = await fetch(`/api/fee-configs?${params.toString()}`);
      const data = await response.json();
      setFeeConfigs(data.data || []);
    } catch (error) {
      console.error("Fetch fee configs error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      setSemesters(data.data || []);
      const currentSemester = data.data?.find((s: { is_current: number }) => s.is_current === 1);
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
      fetchFeeConfigs();
    }
  }, [currentSemesterId]);

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

  // 处理导出
  const handleExport = async () => {
    if (!currentSemesterId) return;

    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("semester_id", currentSemesterId.toString());

      const response = await fetch(`/api/fee-configs/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "导出失败");
      }

      // 下载文件
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      link.download = `费用配置列表_${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">缴费管理</h1>
          <p className="text-muted-foreground">设置每个班级的餐费标准和相关天数</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => currentSemesterId && fetchFeeConfigs()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting || feeConfigs.length === 0 || !currentSemesterId}>
            {exporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            导出
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} disabled={!currentSemesterId}>
            <Upload className="mr-2 h-4 w-4" />
            导入
          </Button>
          <Button onClick={handleAdd} disabled={!currentSemesterId}>
            <Plus className="mr-2 h-4 w-4" />
            新增配置
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
          <FeeConfigTable data={feeConfigs} onEdit={handleEdit} onRefresh={fetchFeeConfigs} />

          <FeeConfigForm
            open={formOpen}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
            feeConfig={editingFeeConfig}
          />

          <FeeConfigImportDialog
            open={importDialogOpen}
            onClose={() => setImportDialogOpen(false)}
            onSuccess={fetchFeeConfigs}
          />
        </>
      )}
    </div>
  );
}
