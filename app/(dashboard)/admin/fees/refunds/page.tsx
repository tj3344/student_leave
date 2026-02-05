"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import type { StudentRefundRecord, Semester, ClassWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefundRecordTable } from "@/components/admin/RefundRecordTable";

export default function RefundsPage() {
  const [refundRecords, setRefundRecords] = useState<StudentRefundRecord[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<number>(0);
  const [exporting, setExporting] = useState(false);

  const fetchRefundRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
      }
      if (classFilter) {
        params.append("class_id", classFilter.toString());
      }

      const response = await fetch(`/api/fees/refunds?${params.toString()}`);
      const data = await response.json();
      setRefundRecords(data.data || []);
    } catch (error) {
      console.error("Fetch refund records error:", error);
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

  const fetchClasses = async () => {
    if (!currentSemesterId) {
      setClasses([]);
      return;
    }
    try {
      const response = await fetch(`/api/classes?semester_id=${currentSemesterId}`);
      const data = await response.json();
      setClasses(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  const handleExport = async () => {
    if (!currentSemesterId) return;

    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("semester_id", currentSemesterId.toString());
      if (classFilter) {
        params.append("class_id", classFilter.toString());
      }

      const response = await fetch(`/api/fees/refunds/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "导出失败");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      link.download = `退费记录_${timestamp}.xlsx`;
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

  useEffect(() => {
    fetchCurrentSemester();
  }, []);

  useEffect(() => {
    if (currentSemesterId) {
      fetchClasses();
      fetchRefundRecords();
    }
  }, [currentSemesterId]);

  useEffect(() => {
    if (currentSemesterId) {
      fetchRefundRecords();
    }
  }, [classFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">退费记录</h1>
          <p className="text-muted-foreground">查看每个学生的退费金额（实时计算）</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting || refundRecords.length === 0 || !currentSemesterId}>
            {exporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            导出
          </Button>
          <Button variant="outline" size="icon" onClick={fetchRefundRecords} disabled={loading || !currentSemesterId}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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

      <div className="flex gap-4">
        <Select value={classFilter.toString()} onValueChange={(v) => setClassFilter(v === "0" ? 0 : parseInt(v, 10))} disabled={!currentSemesterId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="全部班级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">全部班级</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id.toString()}>
                {cls.grade_name} {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <RefundRecordTable data={refundRecords} />
    </div>
  );
}
