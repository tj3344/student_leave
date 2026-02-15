"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Search, Upload, Download, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import type { LeaveWithDetails, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 懒加载组件
const LeaveTable = dynamic(() => import("@/components/admin/LeaveTable").then(m => ({ default: m.LeaveTable })), {
  ssr: false,
});
const LeaveReviewDialog = dynamic(() => import("@/components/admin/LeaveReviewDialog").then(m => ({ default: m.LeaveReviewDialog })), {
  ssr: false,
});
const LeaveImportDialog = dynamic(() => import("@/components/admin/LeaveImportDialog").then(m => ({ default: m.LeaveImportDialog })), {
  ssr: false,
});
const LeaveForm = dynamic(() => import("@/components/teacher/LeaveForm").then(m => ({ default: m.LeaveForm })), {
  ssr: false,
});
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
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [currentSemesterName, setCurrentSemesterName] = useState<string | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [classList, setClassList] = useState<Array<{ id: number; name: string; grade_name: string }>>([]);
  const [classFilter, setClassFilter] = useState("");
  const [teacherApplyEnabled, setTeacherApplyEnabled] = useState(true); // 教师请假申请功能开关
  const [canEditLeave, setCanEditLeave] = useState(true); // 编辑权限开关

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<LeaveWithDetails | null>(null);
  const [reviewMode, setReviewMode] = useState<"view" | "approve" | "reject">("view");

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLeave, setDeleteLeave] = useState<LeaveWithDetails | null>(null);

  // 编辑表单状态
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveWithDetails | null>(null);

  // 导入对话框状态
  const [importOpen, setImportOpen] = useState(false);

  // 撤销审核对话框状态
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokingLeave, setRevokingLeave] = useState<LeaveWithDetails | null>(null);

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok) {
          const user = data.user as User;
          setCurrentUser(user);

          // 检查角色，如果是班主任则重定向到班主任仪表盘
          if (user.role === "class_teacher") {
            window.location.href = "/class-teacher";
            return;
          }

          // 获取系统配置
          fetchSystemConfig();
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

  // 获取系统配置
  const fetchSystemConfig = async () => {
    try {
      const response = await fetch("/api/system-config/leave.teacher_apply_enabled");
      const data = await response.json();
      if (data.data?.config_value) {
        setTeacherApplyEnabled(data.data.config_value === "true" || data.data.config_value === "1");
      }

      // 获取编辑权限配置（配置可能不存在，使用默认值）
      try {
        const editRes = await fetch("/api/system-config/permission.class_teacher_edit_leave");
        const editData = await editRes.json();
        if (editData.data?.config_value) {
          setCanEditLeave(editData.data.config_value === "true" || editData.data.config_value === "1");
        }
      } catch (editError) {
        // 配置不存在时，使用默认值 true（管理员和班主任默认可编辑）
        if (currentUser?.role === "admin" || currentUser?.role === "class_teacher") {
          setCanEditLeave(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch system config:", error);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      if (currentSemesterId) params.append("semester_id", currentSemesterId.toString());
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

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams();
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
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
      fetchCurrentSemester();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentSemesterId) {
      fetchLeaves();
      fetchClasses();
    }
  }, [currentUser, searchQuery, statusFilter, currentSemesterId, classFilter]);

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

  const handleEdit = (leave: LeaveWithDetails) => {
    setEditingLeave(leave);
    setEditFormOpen(true);
  };

  const handleRevoke = (leave: LeaveWithDetails) => {
    setRevokingLeave(leave);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = async () => {
    if (!revokingLeave) return;

    try {
      const response = await fetch(`/api/leaves/${revokingLeave.id}/revoke`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "撤销审核失败");
      }

      fetchLeaves();
      setRevokeDialogOpen(false);
      setRevokingLeave(null);
    } catch (error) {
      console.error("Revoke leave error:", error);
      alert(error instanceof Error ? error.message : "撤销审核失败，请稍后重试");
    }
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

  // 导出请假列表
  const handleExport = async () => {
    if (!currentSemesterId) return;

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      params.append("semester_id", currentSemesterId.toString());
      if (classFilter) params.append("class_id", classFilter);

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

  // 根据角色判断权限
  const canCreate = currentUser?.role === "admin" ||
    currentUser?.role === "class_teacher" ||
    (currentUser?.role === "teacher" && teacherApplyEnabled);
  const canReview = currentUser?.role === "admin";
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "class_teacher";
  const canEdit = currentUser?.role === "admin" || (currentUser?.role === "class_teacher" && canEditLeave);
  const canImport = currentUser?.role === "admin";
  const canExport = currentUser?.role === "admin" || currentUser?.role === "class_teacher";
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
          <Button variant="outline" size="icon" onClick={() => currentSemesterId && fetchLeaves()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canExport && (
            <Button variant="outline" onClick={handleExport} disabled={!currentSemesterId}>
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
          )}
          {canImport && (
            <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!currentSemesterId}>
              <Upload className="mr-2 h-4 w-4" />
              导入
            </Button>
          )}
          {canCreate && (
            <Button onClick={handleNewLeave} disabled={!currentSemesterId}>
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
                placeholder={currentUser.role === "admin" ? "搜索学生姓名、学号、申请人..." : "搜索学生姓名、学号..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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
            onRevoke={canReview ? handleRevoke : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            onEdit={canEdit ? handleEdit : undefined}
            canEdit={canEdit}
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

          {/* 撤销审核确认对话框 */}
          <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认退回到待审核</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要将这条请假记录退回到待审核状态吗？退回后需要重新审核。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRevoke}>确认退回</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 导入对话框 */}
          <LeaveImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            onSuccess={() => {
              setImportOpen(false);
              fetchLeaves();
            }}
            currentSemesterId={currentSemesterId}
            currentSemesterName={currentSemesterName}
          />

          {/* 编辑表单 */}
          <LeaveForm
            open={editFormOpen}
            onClose={() => {
              setEditFormOpen(false);
              setEditingLeave(null);
            }}
            onSuccess={() => {
              setEditFormOpen(false);
              setEditingLeave(null);
              fetchLeaves();
            }}
            editingLeave={editingLeave ?? undefined}
            mode={editingLeave ? "edit" : "create"}
            currentUser={currentUser}
          />
        </>
      )}
    </div>
  );
}
