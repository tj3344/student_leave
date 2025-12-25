"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { StudentRefundRecord, Semester, ClassWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefundRecordTable } from "@/components/admin/RefundRecordTable";

export default function RefundsPage() {
  const [refundRecords, setRefundRecords] = useState<StudentRefundRecord[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState<number>(0);
  const [classFilter, setClassFilter] = useState<number>(0);
  const [exporting, setExporting] = useState(false);

  const fetchRefundRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (semesterFilter) params.append("semester_id", semesterFilter.toString());
      if (classFilter) params.append("class_id", classFilter.toString());

      const response = await fetch(`/api/fees/refunds?${params.toString()}`);
      const data = await response.json();
      setRefundRecords(data.data || []);
    } catch (error) {
      console.error("Fetch refund records error:", error);
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

  const fetchClasses = async (semesterId: number) => {
    if (!semesterId) {
      setClasses([]);
      return;
    }
    try {
      const response = await fetch(`/api/classes?semester_id=${semesterId}`);
      const data = await response.json();
      setClasses(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (semesterFilter) params.append("semester_id", semesterFilter.toString());
      if (classFilter) params.append("class_id", classFilter.toString());

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
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (semesterFilter) {
      fetchClasses(semesterFilter);
    } else {
      setClasses([]);
      setClassFilter(0);
    }
  }, [semesterFilter]);

  useEffect(() => {
    fetchRefundRecords();
  }, [semesterFilter, classFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">退费记录</h1>
          <p className="text-muted-foreground">查看每个学生的退费金额（实时计算）</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting || refundRecords.length === 0}>
            {exporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            导出
          </Button>
          <Button variant="outline" size="icon" onClick={fetchRefundRecords} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={semesterFilter.toString()} onValueChange={(v) => {
          setSemesterFilter(v === "0" ? 0 : parseInt(v, 10));
          setClassFilter(0);
        }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="请选择学期" />
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

        <Select value={classFilter.toString()} onValueChange={(v) => setClassFilter(v === "0" ? 0 : parseInt(v, 10))} disabled={!semesterFilter}>
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
