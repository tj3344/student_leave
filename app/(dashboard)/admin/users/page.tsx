"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Search, Upload, Download, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// 懒加载组件
const UserForm = dynamic(() => import("@/components/admin/UserForm").then(m => ({ default: m.UserForm })), {
  ssr: false,
});
const UserTable = dynamic(() => import("@/components/admin/UserTable").then(m => ({ default: m.UserTable })), {
  ssr: false,
});
const UserImportDialog = dynamic(() => import("@/components/admin/UserImportDialog").then(m => ({ default: m.UserImportDialog })), {
  ssr: false,
});
// 用户管理页面可选角色（班主任在班级管理中分配）
const USER_MANAGEMENT_ROLES: Record<string, string> = {
  admin: "管理员",
  teacher: "教师",
};

export default function UsersPage() {
  const [users, setUsers] = useState<Array<Omit<User, "password_hash"> & { class_id?: number; class_name?: string; grade_name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<User, "password_hash"> | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasClassFilter, setHasClassFilter] = useState("");
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 批量删除状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleteDialog, setBatchDeleteDialog] = useState(false);

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      const currentSemester = data.data?.find((s: { is_current: boolean }) => s.is_current === true);
      if (currentSemester) {
        setCurrentSemesterId(currentSemester.id);
      }
    } catch (error) {
      console.error("Fetch current semester error:", error);
    } finally {
      setSemesterLoading(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("is_active", statusFilter);
      if (hasClassFilter) params.append("has_class", hasClassFilter);
      if (currentSemesterId) params.append("semester_id", currentSemesterId.toString());
      params.append("page", page.toString());
      params.append("limit", pagination.limit.toString());

      const response = await fetch(`/api/users?${params.toString()}`);
      const data = await response.json();

      setUsers(data.data || []);
      setPagination({
        page: data.page || 1,
        limit: data.limit || 20,
        total: data.total || 0,
        totalPages: data.totalPages || 0,
      });
    } catch (error) {
      console.error("Fetch users error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(newPage);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    const response = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });

    const result = await response.json();

    if (result.success) {
      setBatchDeleteDialog(false);
      setSelectedIds(new Set());
      fetchUsers(pagination.page);
      alert(result.message || "批量删除成功");
    } else {
      alert(result.error || result.message || "批量删除失败");
    }
  };

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 })); // 重置到第一页
    fetchUsers(1);
  }, [searchQuery, roleFilter, statusFilter, hasClassFilter, currentSemesterId]);

  useEffect(() => {
    fetchCurrentSemester();
  }, []);

  const handleEdit = (user: Omit<User, "password_hash">) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(undefined);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingUser(undefined);
  };

  const handleFormSuccess = () => {
    fetchUsers();
  };

  // 导出用户列表
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("is_active", statusFilter);

      const response = await fetch(`/api/users/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `users_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const isTeacherRole = roleFilter === "teacher";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户账号</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchUsers(pagination.page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setBatchDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              批量删除 ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            导入
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增用户
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索用户名、姓名或手机号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setHasClassFilter(""); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {Object.entries(USER_MANAGEMENT_ROLES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isTeacherRole && (
          <Select value={hasClassFilter || "all"} onValueChange={(v) => setHasClassFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="班级分配" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="true">已分配班级</SelectItem>
              <SelectItem value="false">未分配班级</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="1">启用</SelectItem>
            <SelectItem value="0">禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <UserTable
        data={users}
        onEdit={handleEdit}
        onRefresh={() => fetchUsers(pagination.page)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      <UserForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        user={editingUser}
      />

      <UserImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          fetchUsers();
        }}
      />

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialog} onOpenChange={setBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.size} 个用户吗？
              <br />
              当前学期的班主任或有关联记录的用户将无法删除。
              <br />
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
