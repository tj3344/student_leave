"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2, Star } from "lucide-react";
import type { Semester } from "@/types";
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

interface SemesterTableProps {
  data: Semester[];
  onEdit: (semester: Semester) => void;
  onDelete: () => void;
  onRefresh: () => void;
}

function SemesterTableInternal({ data, onEdit, onDelete, onRefresh }: SemesterTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; semester?: Semester }>({
    open: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.semester) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/semesters/${deleteDialog.semester.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "删除失败");
      }

      setDeleteDialog({ open: false, semester: undefined });
      onDelete();
    } catch (error) {
      console.error("Delete semester error:", error);
      alert(error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.semester, onDelete]);

  const handleSetCurrent = useCallback(async (semester: Semester) => {
    try {
      const response = await fetch(`/api/semesters/${semester.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_current" }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "操作失败");
      }

      onRefresh();
    } catch (error) {
      console.error("Set current semester error:", error);
      alert(error instanceof Error ? error.message : "操作失败，请稍后重试");
    }
  }, [onRefresh]);

  const handleEdit = useCallback((semester: Semester) => {
    onEdit(semester);
  }, [onEdit]);

  const openDeleteDialog = useCallback((semester: Semester) => {
    setDeleteDialog({ open: true, semester });
  }, []);

  const tableRows = useMemo(() => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center">
            暂无数据
          </TableCell>
        </TableRow>
      );
    }

    return data.map((semester) => (
      <SemesterRow
        key={semester.id}
        semester={semester}
        onEdit={handleEdit}
        onSetCurrent={handleSetCurrent}
        onOpenDeleteDialog={openDeleteDialog}
      />
    ));
  }, [data, handleEdit, handleSetCurrent, openDeleteDialog]);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学期名称</TableHead>
              <TableHead>开始日期</TableHead>
              <TableHead>结束日期</TableHead>
              <TableHead>学校天数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, semester: deleteDialog.semester })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除学期 &quot;{deleteDialog.semester?.name}&quot; 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SemesterRowProps {
  semester: Semester;
  onEdit: (semester: Semester) => void;
  onSetCurrent: (semester: Semester) => void;
  onOpenDeleteDialog: (semester: Semester) => void;
}

const SemesterRow = memo(function SemesterRow({ semester, onEdit, onSetCurrent, onOpenDeleteDialog }: SemesterRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {semester.name}
          {semester.is_current && (
            <Badge variant="default" className="gap-1">
              <Star className="h-3 w-3 fill-current" />
              当前
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {format(new Date(semester.start_date), "yyyy-MM-dd", { locale: zhCN })}
      </TableCell>
      <TableCell>
        {format(new Date(semester.end_date), "yyyy-MM-dd", { locale: zhCN })}
      </TableCell>
      <TableCell>{semester.school_days} 天</TableCell>
      <TableCell>
        {semester.is_current ? (
          <Badge variant="default">当前学期</Badge>
        ) : (
          <Badge variant="secondary">非当前</Badge>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!semester.is_current && (
              <DropdownMenuItem onClick={() => onSetCurrent(semester)}>
                <Star className="mr-2 h-4 w-4" />
                设为当前学期
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(semester)}>
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onOpenDeleteDialog(semester)}
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

export const SemesterTable = memo(SemesterTableInternal);
