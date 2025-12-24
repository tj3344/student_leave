"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search } from "lucide-react";
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
import { LEAVE_STATUS_NAMES } from "@/lib/constants";

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [classList, setClassList] = useState<Array<{ id: number; name: string; grade_name: string }>>([]);
  const [classFilter, setClassFilter] = useState("");
  const [semesterList, setSemesterList] = useState<Array<{ id: number; name: string }>>([]);

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<LeaveWithDetails | null>(null);
  const [reviewMode, setReviewMode] = useState<"view" | "approve" | "reject">("view");

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLeave, setDeleteLeave] = useState<LeaveWithDetails | null>(null);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      if (semesterFilter) params.append("semester_id", semesterFilter);
      if (classFilter) params.append("class_id", classFilter);

      const response = await fetch(`/api/leaves?${params.toString()}`);
      const data = await response.json();
      setLeaves(data.data || []);
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
  }, [searchQuery, statusFilter, semesterFilter, classFilter]);

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

  const handleDelete = (leave: LeaveWithDetails) => {
    setDeleteLeave(leave);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteLeave) return;

    try {
      const response = await fetch(`/api/leaves/${deleteLeave.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "删除失败");
      }

      fetchLeaves();
      setDeleteDialogOpen(false);
      setDeleteLeave(null);
    } catch (error) {
      console.error("Delete leave error:", error);
      alert(error instanceof Error ? error.message : "删除失败，请稍后重试");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">请假管理</h1>
          <p className="text-muted-foreground">管理和审核所有请假申请</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchLeaves} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

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
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">{LEAVE_STATUS_NAMES.pending}</SelectItem>
            <SelectItem value="approved">{LEAVE_STATUS_NAMES.approved}</SelectItem>
            <SelectItem value="rejected">{LEAVE_STATUS_NAMES.rejected}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <LeaveTable
        data={leaves}
        showReviewActions={true}
        onViewDetail={handleViewDetail}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
      />

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

      {/* 删除确认对话框 */}
      {deleteLeave && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${deleteDialogOpen ? "" : "hidden"}`}>
          <div className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">确认删除</h3>
            <p className="text-muted-foreground mb-4">确定要删除这条请假记录吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
              <Button variant="destructive" onClick={confirmDelete}>删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
