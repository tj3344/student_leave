"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { Semester } from "@/types";

const semesterSchema = z
  .object({
    name: z.string().min(1, "学期名称不能为空").max(50, "学期名称不能超过50个字符"),
    start_date: z.string().min(1, "开始日期不能为空"),
    end_date: z.string().min(1, "结束日期不能为空"),
    school_days: z.coerce
      .number()
      .min(1, "学校天数必须大于0")
      .max(365, "学校天数不能超过365"),
    is_current: z.boolean().default(false),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "结束日期必须大于开始日期",
    path: ["end_date"],
  });

type SemesterFormValues = z.infer<typeof semesterSchema>;

interface SemesterFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  semester?: Semester;
}

export function SemesterForm({ open, onClose, onSuccess, semester }: SemesterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!semester;

  const form = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      name: "",
      start_date: "",
      end_date: "",
      school_days: 0,
      is_current: false,
    },
  });

  useEffect(() => {
    if (semester) {
      form.reset({
        name: semester.name,
        start_date: semester.start_date,
        end_date: semester.end_date,
        school_days: semester.school_days,
        is_current: semester.is_current === 1,
      });
    } else {
      form.reset({
        name: "",
        start_date: "",
        end_date: "",
        school_days: 0,
        is_current: false,
      });
    }
  }, [semester, form]);

  const onSubmit = async (values: SemesterFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/semesters/${semester.id}` : "/api/semesters";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error || "操作失败");
        Object.assign(error, { status: response.status });
        throw error;
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status !== 400) {
        console.error("Submit semester error:", error);
      }
      form.setError("root", {
        message: error instanceof Error ? error.message : "操作失败，请稍后重试",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑学期" : "新增学期"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改学期信息" : "创建新的学期"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="semester-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>学期名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：2024-2025学年第一学期" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>开始日期 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>结束日期 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="school_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学校天数（天）*</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="365" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_current"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">设为当前学期</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button
            type="submit"
            form="semester-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
