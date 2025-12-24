"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { FeeConfigWithDetails } from "@/types";
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

interface FeeConfigTableProps {
  data: FeeConfigWithDetails[];
  onEdit: (feeConfig: FeeConfigWithDetails) => void;
  onRefresh: () => void;
}

export function FeeConfigTable({ data, onEdit, onRefresh }: FeeConfigTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; feeConfig?: FeeConfigWithDetails }>({
    open: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = async () => {
    if (!deleteDialog.feeConfig) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/fee-configs/${deleteDialog.feeConfig.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "删除失败");
      }

      setDeleteDialog({ open: false, feeConfig: undefined });
      onRefresh();
    } catch (error) {
      console.error("Delete fee config error:", error);
      alert(error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学期</TableHead>
              <TableHead>班级</TableHead>
              <TableHead>班主任</TableHead>
              <TableHead className="text-right">餐费标准</TableHead>
              <TableHead className="text-center">预收天数</TableHead>
              <TableHead className="text-center">实收天数</TableHead>
              <TableHead className="text-center">停课天数</TableHead>
              <TableHead className="w-[70px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.semester_name}</TableCell>
                  <TableCell>
                    {item.grade_name} {item.class_name}
                  </TableCell>
                  <TableCell>{item.class_teacher_name || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.meal_fee_standard)}</TableCell>
                  <TableCell className="text-center">{item.prepaid_days}</TableCell>
                  <TableCell className="text-center">{item.actual_days}</TableCell>
                  <TableCell className="text-center">{item.suspension_days}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog({ open: true, feeConfig: item })}
                          className="text-destructive focus:text-destructive"
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

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, feeConfig: deleteDialog.feeConfig })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 &quot;{deleteDialog.feeConfig?.semester_name} - {deleteDialog.feeConfig?.grade_name} {deleteDialog.feeConfig?.class_name}&quot;
              的费用配置吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isProcessing ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
