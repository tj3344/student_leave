"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff, GraduationCap } from "lucide-react";
import type { TeacherWithClass } from "@/lib/api/teachers";
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
import { Badge } from "@/components/ui/badge";

interface TeacherTableProps {
  data: TeacherWithClass[];
  onEdit: (teacher: TeacherWithClass) => void;
  onRefresh: () => void;
}

const TEACHER_ROLE_NAMES: Record<string, string> = {
  teacher: "教师",
  class_teacher: "班主任",
};

export function TeacherTable({ data, onEdit, onRefresh }: TeacherTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; teacher?: TeacherWithClass }>({
    open: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = async () => {
    if (!deleteDialog.teacher) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/teachers/${deleteDialog.teacher.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "删除失败");
      }

      setDeleteDialog({ open: false, teacher: undefined });
      onRefresh();
    } catch (error) {
      console.error("Delete teacher error:", error);
      alert(error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (teacher: TeacherWithClass) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/teachers/${teacher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "操作失败");
      }

      onRefresh();
    } catch (error) {
      console.error("Toggle teacher status error:", error);
      alert(error instanceof Error ? error.message : "操作失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "class_teacher":
        return "default";
      case "teacher":
        return "secondary";
      default:
        return "outline";
    }
  };

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
              <TableHead>邮箱</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[70px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.username}</TableCell>
                  <TableCell>{teacher.real_name}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(teacher.role)}>
                      {TEACHER_ROLE_NAMES[teacher.role] || teacher.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {teacher.class_name ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{teacher.class_name}</span>
                        {teacher.grade_name && (
                          <span className="text-xs text-muted-foreground">{teacher.grade_name}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">未分配</span>
                    )}
                  </TableCell>
                  <TableCell>{teacher.phone || "-"}</TableCell>
                  <TableCell>{teacher.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.is_active ? "default" : "secondary"}>
                      {teacher.is_active ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(teacher.created_at).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(teacher)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(teacher)}>
                          {teacher.is_active ? (
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteDialog({ open: true, teacher })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, teacher: deleteDialog.teacher })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除教师 &quot;{deleteDialog.teacher?.real_name}&quot;（{deleteDialog.teacher?.username}）吗？
              {deleteDialog.teacher?.class_name && (
                <>
                  <br />
                  注意：该教师已分配到班级 &quot;{deleteDialog.teacher.class_name}&quot;，删除后需要重新分配班主任。
                </>
              )}
              <br />
              此操作不可撤销。
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
    </>
  );
}
