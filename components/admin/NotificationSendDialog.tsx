"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bell } from "lucide-react";
import { NOTIFICATION_TYPE_NAMES } from "@/lib/constants";
import type { NotificationClassTeacher } from "@/types";

const notificationSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题不能超过100个字符"),
  content: z.string().min(1, "内容不能为空").max(1000, "内容不能超过1000个字符"),
  type: z.enum(["system", "announcement", "reminder", "warning"], {
    required_error: "请选择通知类型",
  }),
  receiver_ids: z.array(z.number()).min(1, "请至少选择一个接收者"),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface NotificationSendDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NotificationSendDialog({ open, onClose, onSuccess }: NotificationSendDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<NotificationClassTeacher[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "announcement",
      receiver_ids: [],
    },
  });

  // 获取班主任列表
  useEffect(() => {
    if (open) {
      const fetchTeachers = async () => {
        setIsLoadingTeachers(true);
        try {
          const response = await fetch("/api/notifications/class-teachers");
          const data = await response.json();
          if (response.ok) {
            setTeachers(data.data);
          }
        } catch (error) {
          console.error("获取班主任列表失败:", error);
        } finally {
          setIsLoadingTeachers(false);
        }
      };
      fetchTeachers();
    }
  }, [open]);

  // 重置表单
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (values: NotificationFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "发送失败");
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error: unknown) {
      console.error("Send notification error:", error);
      form.setError("root", {
        message: error instanceof Error ? error.message : "发送失败，请稍后重试",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 全选/取消全选
  const handleToggleAll = (checked: boolean) => {
    const allIds = teachers.map((t) => t.id);
    form.setValue("receiver_ids", checked ? allIds : []);
  };

  // 是否全选
  const isAllSelected =
    teachers.length > 0 && form.watch("receiver_ids").length === teachers.length;
  // 是否部分选中
  const isIndeterminate =
    form.watch("receiver_ids").length > 0 && form.watch("receiver_ids").length < teachers.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            发送通知
          </DialogTitle>
          <DialogDescription>向班主任发送通知信息</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="notification-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入通知标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>内容 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入通知内容"
                      rows={4}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通知类型 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择通知类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(NOTIFICATION_TYPE_NAMES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiver_ids"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>接收班主任 *</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleToggleAll(!isAllSelected)}
                    >
                      {isAllSelected ? "取消全选" : "全选"}
                    </Button>
                  </div>
                  <div className="rounded-md border p-3 max-h-[200px] overflow-y-auto space-y-2">
                    {isLoadingTeachers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : teachers.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        暂无可用的班主任
                      </div>
                    ) : (
                      teachers.map((teacher) => (
                        <div key={teacher.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`teacher-${teacher.id}`}
                            checked={field.value.includes(teacher.id)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...field.value, teacher.id]
                                : field.value.filter((id) => id !== teacher.id);
                              field.onChange(updated);
                            }}
                          />
                          <label
                            htmlFor={`teacher-${teacher.id}`}
                            className="flex-1 text-sm cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span>{teacher.real_name}</span>
                              {teacher.class_name && (
                                <span className="text-muted-foreground text-xs">
                                  {teacher.class_name}
                                </span>
                              )}
                            </div>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
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
          <Button type="submit" form="notification-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            发送
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
