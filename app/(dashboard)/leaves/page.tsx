"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Search } from "lucide-react";
import type { LeaveWithDetails, User } from "@/types";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LEAVE_STATUS_NAMES } from "@/lib/constants";

export default function UnifiedLeavesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok) {
          setCurrentUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Fetch user error:", error);
        router.push("/login");
      }
    };
    fetchCurrentUser();
  }, [router]);

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
    if (currentUser) {
      fetchLeaves();
      fetchSemesters();
    }
  }, [currentUser, searchQuery, statusFilter, semesterFilter, classFilter]);

  // 当学期变化时，重新获取班级列表
  useEffect(() => {
    if (currentUser && semesterFilter) {
      fetchClasses();
    }
  }, [currentUser, semesterFilter]);

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

  const handleNewLeave = () => {
    router.push("/leaves/new");
  };

  // 根据角色判断权限
  const canCreate = currentUser?.role === "admin" || currentUser?.role === "class_teacher";
  const canReview = currentUser?.role === "admin";
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "class_teacher";
  const showClassFilter = currentUser?.role === "admin" || currentUser?.role === "class_teacher";

  // 根据角色显示页面标题
  const getPageTitle = () => {
    if (currentUser?.role === "teacher") return "请假记录";
    if (currentUser?.role === "class_teacher") return "班级请假管理";
    return "请假管理";
  };

  const getPageDescription = () => {
    if (currentUser?.role === "teacher") return "查看学生请假记录";
    if (currentUser?.role === "class_teacher") return "管理本班学生的请假申请";
    return "管理和审核所有请假申请";
  };

  if (!currentUser) {
    return <div>加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
          <p className="text-muted-foreground">{getPageDescription()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchLeaves} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canCreate && (
            <Button onClick={handleNewLeave}>
              <Plus className="mr-2 h-4 w-4" />
              新增请假
            </Button>
          )}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={currentUser.role === "admin" ? "搜索学生姓名、学号、申请人..." : "搜索学生姓名、学号..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={semesterFilter || "all"}
          onValueChange={(v) => {
            setSemesterFilter(v === "all" ? "" : v);
            setClassFilter("");
          }}
        >
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
        {showClassFilter && (
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
        )}
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
        showReviewActions={canReview}
        onViewDetail={handleViewDetail}
        onApprove={canReview ? handleApprove : undefined}
        onReject={canReview ? handleReject : undefined}
        onDelete={canDelete ? handleDelete : undefined}
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条请假记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
