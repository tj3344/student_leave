"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { Grade } from "@/types";

const gradeSchema = z.object({
  name: z.string().min(1, "年级名称不能为空").max(20, "年级名称不能超过20个字符"),
  sort_order: z.coerce.number().int().min(0, "排序号必须大于等于0"),
});

type GradeFormValues = z.infer<typeof gradeSchema>;

interface GradeFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  grade?: Grade;
}

export function GradeForm({ open, onClose, onSuccess, grade }: GradeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!grade;

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      name: grade?.name || "",
      sort_order: grade?.sort_order ?? 0,
    },
  });

  const onSubmit = async (values: GradeFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/grades/${grade.id}` : "/api/grades";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "操作失败");
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error("Submit grade error:", error);
      form.setError("root", {
        message: error instanceof Error ? error.message : "操作失败，请稍后重试",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑年级" : "新增年级"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改年级信息" : "创建新的年级"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="grade-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>年级名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：一年级" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>排序号</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="submit" form="grade-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
