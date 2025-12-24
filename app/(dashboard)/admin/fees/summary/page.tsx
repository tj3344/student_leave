"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import type { ClassRefundSummaryFull, Semester } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefundSummaryTable } from "@/components/admin/RefundSummaryTable";

export default function RefundSummaryPage() {
  const [summaryData, setSummaryData] = useState<ClassRefundSummaryFull[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState<number>(0);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (semesterFilter) params.append("semester_id", semesterFilter.toString());

      const response = await fetch(`/api/fees/summary?${params.toString()}`);
      const data = await response.json();
      setSummaryData(data.data || []);
    } catch (error) {
      console.error("Fetch refund summary error:", error);
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
    fetchSummaryData();
  }, [semesterFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">退费汇总</h1>
          <p className="text-muted-foreground">按班级汇总退费总金额</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchSummaryData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={semesterFilter.toString()} onValueChange={(v) => setSemesterFilter(v === "0" ? 0 : parseInt(v, 10))}>
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
      </div>

      <RefundSummaryTable data={summaryData} />
    </div>
  );
}
