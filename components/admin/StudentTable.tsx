"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import type { StudentWithDetails } from "@/types";
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

interface StudentTableProps {
  data: StudentWithDetails[];
  onEdit: (student: StudentWithDetails) => void;
  onRefresh: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

function StudentTableInternal({ data, onEdit, onRefresh, canEdit = true, canDelete = true }: StudentTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; student?: StudentWithDetails }>({
    open: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.student) return;

    setIsProcessing(true);
    const response = await fetch(`/api/students/${deleteDialog.student.id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      setDeleteDialog({ open: false, student: undefined });
      onRefresh();
    } else {
      alert(result.error || "删除失败，请稍后重试");
    }

    setIsProcessing(false);
  }, [deleteDialog.student, onRefresh]);

  const handleToggleStatus = useCallback(async (student: StudentWithDetails) => {
    setIsProcessing(true);
    const response = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
    });

    const result = await response.json();

    if (result.success) {
      onRefresh();
    } else {
      alert(result.error || "操作失败，请稍后重试");
    }

    setIsProcessing(false);
  }, [onRefresh]);

  const handleEdit = useCallback((student: StudentWithDetails) => {
    onEdit(student);
  }, [onEdit]);

  const openDeleteDialog = useCallback((student: StudentWithDetails) => {
    setDeleteDialog({ open: true, student });
  }, []);

  const tableRows = useMemo(() => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="h-24 text-center">
            暂无数据
          </TableCell>
        </TableRow>
      );
    }

    return data.map((student) => (
      <StudentRow
        key={student.id}
        student={student}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onOpenDeleteDialog={openDeleteDialog}
      />
    ));
  }, [data, canEdit, canDelete, handleEdit, handleToggleStatus, openDeleteDialog]);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>性别</TableHead>
              <TableHead>班级</TableHead>
              <TableHead>家长姓名</TableHead>
              <TableHead>家长手机</TableHead>
              <TableHead>营养餐</TableHead>
              <TableHead>状态</TableHead>
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
        onOpenChange={(open) => setDeleteDialog({ open, student: deleteDialog.student })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除学生 &quot;{deleteDialog.student?.name}&quot;（{deleteDialog.student?.student_no}）吗？
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

// 表格行组件 - 使用 memo 优化
interface StudentRowProps {
  student: StudentWithDetails;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (student: StudentWithDetails) => void;
  onToggleStatus: (student: StudentWithDetails) => void;
  onOpenDeleteDialog: (student: StudentWithDetails) => void;
}

const StudentRow = memo(function StudentRow({
  student,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onOpenDeleteDialog,
}: StudentRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{student.student_no}</TableCell>
      <TableCell>{student.name}</TableCell>
      <TableCell>{student.gender || "-"}</TableCell>
      <TableCell>
        {student.grade_name} {student.class_name}
      </TableCell>
      <TableCell>{student.parent_name || "-"}</TableCell>
      <TableCell>{student.parent_phone || "-"}</TableCell>
      <TableCell>
        <Badge variant={student.is_nutrition_meal ? "default" : "secondary"}>
          {student.nutrition_meal_name}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={student.is_active ? "default" : "secondary"}>
          {student.is_active ? "在校" : "离校"}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(student)}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onToggleStatus(student)}>
              {student.is_active ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  标记离校
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  标记在校
                </>
              )}
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onOpenDeleteDialog(student)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

// 使用 memo 包装整个组件
export const StudentTable = memo(StudentTableInternal);
