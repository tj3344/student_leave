"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, CheckCircle, AlertCircle } from "lucide-react";
import type { LeaveWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeaveTable } from "@/components/admin/LeaveTable";
import { LeaveReviewDialog } from "@/components/admin/LeaveReviewDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [classList, setClassList] = useState<Array<{ id: number; name: string; grade_name: string }>>([]);
  const [classFilter, setClassFilter] = useState("");
  const [semesterList, setSemesterList] = useState<Array<{ id: number; name: string }>>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<LeaveWithDetails | null>(null);
  const [reviewMode, setReviewMode] = useState<"view" | "approve" | "reject">("view");

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("status", "pending");
      if (searchQuery) params.append("search", searchQuery);
      if (semesterFilter) params.append("semester_id", semesterFilter);
      if (classFilter) params.append("class_id", classFilter);

      const response = await fetch(`/api/leaves?${params.toString()}`);
      const data = await response.json();
      setLeaves(data.data || []);
      setPendingCount(data.total || 0);
    } catch (error) {
      console.error("Fetch leaves error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      setSemesterList(data.data || []);

      // 自动选择当前学期
      const currentSemester = data.data?.find((s: { is_current: number }) => s.is_current === 1);
      if (currentSemester) {
        setSemesterFilter(currentSemester.id.toString());
      }
    } catch (error) {
      console.error("Fetch semesters error:", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams();
      if (semesterFilter) {
        params.append("semester_id", semesterFilter);
      }
      const response = await fetch(`/api/classes?${params.toString()}`);
      const data = await response.json();
      setClassList(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchSemesters();
    fetchClasses();
  }, [searchQuery, semesterFilter, classFilter]);

  const handleViewDetail = (leave: LeaveWithDetails) => {
    setReviewLeave(leave);
    setReviewMode("view");
    setReviewDialogOpen(true);
  };

  const handleApprove = (leave: LeaveWithDetails) => {
    setReviewLeave(leave);
    setReviewMode("approve");
    setReviewDialogOpen(true);
  };

  const handleReject = (leave: LeaveWithDetails) => {
    setReviewLeave(leave);
    setReviewMode("reject");
    setReviewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            待审核请假
          </h1>
          <p className="text-muted-foreground">审核待处理的请假申请</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchLeaves} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 统计卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">待审核申请</p>
              <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-200" />
          </div>
        </CardContent>
      </Card>

      {/* 筛选栏 */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索学生姓名、学号、申请人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={semesterFilter || "all"} onValueChange={(v) => {
          setSemesterFilter(v === "all" ? "" : v);
          setClassFilter("");
        }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择学期" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部学期</SelectItem>
            {semesterList.map((semester) => (
              <SelectItem key={semester.id} value={semester.id.toString()}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择班级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部班级</SelectItem>
            {classList.map((cls) => (
              <SelectItem key={cls.id} value={cls.id.toString()}>
                {cls.grade_name} - {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {leaves.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
            <p className="text-lg">暂无待审核的请假申请</p>
          </CardContent>
        </Card>
      ) : (
        <LeaveTable
          data={leaves}
          showReviewActions={true}
          onViewDetail={handleViewDetail}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* 审核对话框 */}
      <LeaveReviewDialog
        open={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          setReviewLeave(null);
        }}
        onSuccess={fetchLeaves}
        leave={reviewLeave}
        mode={reviewMode}
      />
    </div>
  );
}
