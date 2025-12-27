"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react";
import type { Grade } from "@/types";
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

interface GradeTableProps {
  data: Grade[];
  onEdit: (grade: Grade) => void;
  onDelete: () => void;
}

function GradeTableInternal({ data, onEdit, onDelete }: GradeTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; grade?: Grade }>({
    open: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.grade) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/grades/${deleteDialog.grade.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "删除失败");
      }

      setDeleteDialog({ open: false, grade: undefined });
      onDelete();
    } catch (error) {
      console.error("Delete grade error:", error);
      alert(error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.grade, onDelete]);

  const handleEdit = useCallback((grade: Grade) => {
    onEdit(grade);
  }, [onEdit]);

  const openDeleteDialog = useCallback((grade: Grade) => {
    setDeleteDialog({ open: true, grade });
  }, []);

  const tableRows = useMemo(() => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            暂无数据
          </TableCell>
        </TableRow>
      );
    }

    return data.map((grade) => (
      <GradeRow
        key={grade.id}
        grade={grade}
        onEdit={handleEdit}
        onOpenDeleteDialog={openDeleteDialog}
      />
    ));
  }, [data, handleEdit, openDeleteDialog]);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>年级名称</TableHead>
              <TableHead>排序号</TableHead>
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
        onOpenChange={(open) => setDeleteDialog({ open, grade: deleteDialog.grade })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除年级 &quot;{deleteDialog.grade?.name}&quot; 吗？此操作不可撤销。
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

interface GradeRowProps {
  grade: Grade;
  onEdit: (grade: Grade) => void;
  onOpenDeleteDialog: (grade: Grade) => void;
}

const GradeRow = memo(function GradeRow({ grade, onEdit, onOpenDeleteDialog }: GradeRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{grade.name}</TableCell>
      <TableCell>{grade.sort_order}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(grade)}>
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onOpenDeleteDialog(grade)}
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

export const GradeTable = memo(GradeTableInternal);
