"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import type { ClassRefundSummaryFull, Semester } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefundSummaryTable } from "@/components/admin/RefundSummaryTable";

export default function RefundSummaryPage() {
  const [summaryData, setSummaryData] = useState<ClassRefundSummaryFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [currentSemesterName, setCurrentSemesterName] = useState<string>("");
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
      }

      const response = await fetch(`/api/fees/summary?${params.toString()}`);
      const data = await response.json();
      setSummaryData(data.data || []);
    } catch (error) {
      console.error("Fetch refund summary error:", error);
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
        setCurrentSemesterName(currentSemester.name);
      }
    } catch (error) {
      console.error("获取当前学期失败:", error);
    } finally {
      setSemesterLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentSemesterId) return;

    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("semester_id", currentSemesterId.toString());

      const response = await fetch(`/api/fees/summary/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "导出失败");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      link.download = `退费汇总_${timestamp}.xlsx`;
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
      fetchSummaryData();
    }
  }, [currentSemesterId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">退费汇总</h1>
          <p className="text-muted-foreground">按班级汇总退费总金额</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting || summaryData.length === 0 || !currentSemesterId}>
            {exporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            导出
          </Button>
          <Button variant="outline" size="icon" onClick={fetchSummaryData} disabled={loading || !currentSemesterId}>
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

      {/* 当前学期显示 */}
      {currentSemesterId && (
        <div className="rounded-md bg-muted p-3">
          <div className="text-sm font-medium">当前学期</div>
          <div className="text-sm text-muted-foreground">{currentSemesterName}</div>
        </div>
      )}

      <RefundSummaryTable data={summaryData} />
    </div>
  );
}
