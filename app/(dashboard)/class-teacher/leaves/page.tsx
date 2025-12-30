"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Search, Download, AlertCircle } from "lucide-react";
import type { LeaveWithDetails, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeaveTable } from "@/components/admin/LeaveTable";
import { LeaveReviewDialog } from "@/components/admin/LeaveReviewDialog";
import { LeaveForm } from "@/components/teacher/LeaveForm";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LEAVE_STATUS_NAMES } from "@/lib/constants";

export default function ClassTeacherLeavesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<{ id: number; name: string; grade_name: string } | null>(null);
  const [canEditLeave, setCanEditLeave] = useState(true); // 编辑权限开关
  const [teacherApplyEnabled, setTeacherApplyEnabled] = useState(true); // 教师请假申请功能开关

  // 表单对话框状态
  const [formOpen, setFormOpen] = useState(false);

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<LeaveWithDetails | null>(null);
  const [reviewMode, setReviewMode] = useState<"view" | "approve" | "reject">("view");

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLeave, setDeleteLeave] = useState<LeaveWithDetails | null>(null);

  // 编辑表单状态
  const [editingLeave, setEditingLeave] = useState<LeaveWithDetails | null>(null);

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok) {
          const user = data.user as User;
          setCurrentUser(user);

          // 检查角色，必须是班主任
          if (user.role !== "class_teacher") {
            router.push("/leaves");
            return;
          }

          // 获取班主任管理的班级信息
          fetchClassInfo();
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

  // 获取班主任管理的班级信息
  const fetchClassInfo = async () => {
    try {
      const response = await fetch("/api/class-teacher/class");
      const data = await response.json();
      if (response.ok && data.data) {
        setClassInfo(data.data);
      }

      // 获取编辑权限配置
      const editRes = await fetch("/api/system-config/permission.class_teacher_edit_leave");
      const editData = await editRes.json();
      if (editData.data?.config_value) {
        setCanEditLeave(editData.data.config_value === "true" || editData.data.config_value === "1");
      }

      // 获取教师请假申请功能配置
      const applyRes = await fetch("/api/system-config/leave.teacher_apply_enabled");
      const applyData = await applyRes.json();
      if (applyData.data?.config_value) {
        setTeacherApplyEnabled(applyData.data.config_value === "true" || applyData.data.config_value === "1");
      }
    } catch (error) {
      console.error("Fetch class info error:", error);
    }
  };

  const fetchLeaves = async () => {
    if (!classInfo || !currentSemesterId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      params.append("semester_id", currentSemesterId.toString());
      // 强制只获取本班学生的请假记录
      params.append("class_id", classInfo.id.toString());

      const response = await fetch(`/api/leaves?${params.toString()}`);
      const data = await response.json();
      setLeaves(data.data || []);
    } catch (error) {
      console.error("Fetch leaves error:", error);
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

  useEffect(() => {
    if (classInfo) {
      fetchCurrentSemester();
    }
  }, [classInfo]);

  useEffect(() => {
    if (classInfo && currentSemesterId) {
      fetchLeaves();
    }
  }, [classInfo, searchQuery, statusFilter, currentSemesterId]);

  const handleViewDetail = (leave: LeaveWithDetails) => {
    setReviewLeave(leave);
    setReviewMode("view");
    setReviewDialogOpen(true);
  };

  const handleDelete = (leave: LeaveWithDetails) => {
    setDeleteLeave(leave);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (leave: LeaveWithDetails) => {
    setEditingLeave(leave);
    setFormOpen(true);
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

  // 导出请假列表
  const handleExport = async () => {
    if (!classInfo || !currentSemesterId) return;

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      params.append("semester_id", currentSemesterId.toString());
      params.append("class_id", classInfo.id.toString());

      const response = await fetch(`/api/leaves/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `leaves_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出失败:", error);
      alert("导出失败，请稍后重试");
    }
  };

  if (!currentUser || !classInfo) {
    return <div>加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">班级请假管理</h1>
          <p className="text-muted-foreground">
            管理 {classInfo.grade_name} {classInfo.name} 学生的请假申请
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => currentSemesterId && fetchLeaves()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!currentSemesterId}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          {teacherApplyEnabled && (
            <Button onClick={() => setFormOpen(true)} disabled={!currentSemesterId}>
              <Plus className="mr-2 h-4 w-4" />
              新增请假
            </Button>
          )}
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
          {/* 筛选栏 */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名、学号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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
            showReviewActions={false}
            onViewDetail={handleViewDetail}
            onDelete={handleDelete}
            onEdit={canEditLeave ? handleEdit : undefined}
            canEdit={canEditLeave}
          />
        </>
      )}

      {/* 表单对话框 */}
      <LeaveForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingLeave(null);
        }}
        onSuccess={() => {
          setFormOpen(false);
          setEditingLeave(null);
          fetchLeaves();
        }}
        editingLeave={editingLeave ?? undefined}
        mode={editingLeave ? "edit" : "create"}
        defaultClassId={classInfo?.id}
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
