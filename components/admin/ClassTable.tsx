"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import type { ClassWithDetails } from "@/types";
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

interface ClassTableProps {
  data: ClassWithDetails[];
  onEdit: (classItem: ClassWithDetails) => void;
  onDelete: () => void;
}

export function ClassTable({ data, onEdit, onDelete }: ClassTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    classItem?: ClassWithDetails;
  }>({ open: false });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteDialog.classItem) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/classes/${deleteDialog.classItem.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "删除失败");
      }

      setDeleteDialog({ open: false, classItem: undefined });
      onDelete();
    } catch (error) {
      console.error("Delete class error:", error);
      alert(error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>年级</TableHead>
              <TableHead>班级名称</TableHead>
              <TableHead>班主任</TableHead>
              <TableHead>学生人数</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((classItem) => (
                <TableRow key={classItem.id}>
                  <TableCell>
                    <Badge variant="outline">{classItem.grade_name || "-"}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{classItem.name}</TableCell>
                  <TableCell>
                    {classItem.class_teacher_name ? (
                      <Badge variant="secondary">{classItem.class_teacher_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">未分配</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{classItem.student_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(classItem)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteDialog({ open: true, classItem })}
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

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, classItem: deleteDialog.classItem })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除班级 &quot;{deleteDialog.classItem?.grade_name} {deleteDialog.classItem?.name}&quot;
              吗？此操作不可撤销。
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
