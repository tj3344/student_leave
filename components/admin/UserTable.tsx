"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { MoreHorizontal, Pencil, Trash2, KeyRound, Power, PowerOff } from "lucide-react";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ROLE_NAMES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface UserTableProps {
  data: Array<Omit<User, "password_hash"> & { class_id?: number; class_name?: string; grade_name?: string }>;
  onEdit: (user: Omit<User, "password_hash">) => void;
  onRefresh: () => void;
}

type UserWithoutPassword = Omit<User, "password_hash">;

function UserTableInternal({ data, onEdit, onRefresh }: UserTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user?: UserWithoutPassword }>({
    open: false,
  });
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; user?: UserWithoutPassword }>({
    open: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.user) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/users/${deleteDialog.user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "删除失败");
      }

      setDeleteDialog({ open: false, user: undefined });
      onRefresh();
    } catch (error) {
      console.error("Delete user error:", error);
      alert(error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  }, [deleteDialog.user, onRefresh]);

  const handleToggleStatus = useCallback(async (user: UserWithoutPassword) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "操作失败");
      }

      onRefresh();
    } catch (error) {
      console.error("Toggle user status error:", error);
      alert(error instanceof Error ? error.message : "操作失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  }, [onRefresh]);

  const handleResetPassword = useCallback(async () => {
    if (!resetPasswordDialog.user) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/users/${resetPasswordDialog.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPassword", password: "123456" }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "重置失败");
      }

      alert(`密码已重置为：123456`);
      setResetPasswordDialog({ open: false, user: undefined });
    } catch (error) {
      console.error("Reset password error:", error);
      alert(error instanceof Error ? error.message : "重置失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  }, [resetPasswordDialog.user]);

  const getRoleBadgeVariant = useCallback((role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "admin":
        return "destructive";
      case "class_teacher":
        return "default";
      default:
        return "secondary";
    }
  }, []);

  const handleEdit = useCallback((user: UserWithoutPassword) => {
    onEdit(user);
  }, [onEdit]);

  const openDeleteDialog = useCallback((user: UserWithoutPassword) => {
    setDeleteDialog({ open: true, user });
  }, []);

  const openResetPasswordDialog = useCallback((user: UserWithoutPassword) => {
    setResetPasswordDialog({ open: true, user });
  }, []);

  const tableRows = useMemo(() => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-24 text-center">
            暂无数据
          </TableCell>
        </TableRow>
      );
    }

    return data.map((user) => (
      <UserRow
        key={user.id}
        user={user}
        getRoleBadgeVariant={getRoleBadgeVariant}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onOpenDeleteDialog={openDeleteDialog}
        onOpenResetPasswordDialog={openResetPasswordDialog}
      />
    ));
  }, [data, getRoleBadgeVariant, handleEdit, handleToggleStatus, openDeleteDialog, openResetPasswordDialog]);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>真实姓名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>分配班级</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[70px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows}
          </TableBody>
        </Table>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, user: deleteDialog.user })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户 &quot;{deleteDialog.user?.real_name}&quot;（{deleteDialog.user?.username}）吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重置密码确认对话框 */}
      <AlertDialog
        open={resetPasswordDialog.open}
        onOpenChange={(open) => setResetPasswordDialog({ open, user: resetPasswordDialog.user })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置密码</AlertDialogTitle>
            <AlertDialogDescription>
              确定要重置用户 &quot;{resetPasswordDialog.user?.real_name}&quot; 的密码吗？
              <br />
              密码将被重置为：<strong>123456</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isProcessing}>
              {isProcessing ? "重置中..." : "确认重置"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface UserRowProps {
  user: UserWithoutPassword & { class_id?: number; class_name?: string; grade_name?: string };
  getRoleBadgeVariant: (role: string) => "default" | "secondary" | "destructive" | "outline";
  onEdit: (user: UserWithoutPassword) => void;
  onToggleStatus: (user: UserWithoutPassword) => void;
  onOpenDeleteDialog: (user: UserWithoutPassword) => void;
  onOpenResetPasswordDialog: (user: UserWithoutPassword) => void;
}

const UserRow = memo(function UserRow({
  user,
  getRoleBadgeVariant,
  onEdit,
  onToggleStatus,
  onOpenDeleteDialog,
  onOpenResetPasswordDialog,
}: UserRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{user.username}</TableCell>
      <TableCell>{user.real_name}</TableCell>
      <TableCell>
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {ROLE_NAMES[user.role]}
        </Badge>
      </TableCell>
      <TableCell>
        {(user.role === "teacher" || user.role === "class_teacher") && user.class_name ? (
          <div className="flex flex-col">
            <span className="font-medium">{user.class_name}</span>
            {user.grade_name && (
              <span className="text-xs text-muted-foreground">{user.grade_name}</span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>{user.phone || "-"}</TableCell>
      <TableCell>
        <Badge variant={user.is_active ? "default" : "secondary"}>
          {user.is_active ? "启用" : "禁用"}
        </Badge>
      </TableCell>
      <TableCell>
        {new Date(user.created_at).toLocaleDateString("zh-CN")}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(user)}>
              {user.is_active ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  禁用
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  启用
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenResetPasswordDialog(user)}>
              <KeyRound className="mr-2 h-4 w-4" />
              重置密码
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onOpenDeleteDialog(user)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

export const UserTable = memo(UserTableInternal);
