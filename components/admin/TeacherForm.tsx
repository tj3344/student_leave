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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { TeacherWithClass } from "@/lib/api/teachers";

const teacherSchema = z.object({
  username: z.string().min(2, "用户名至少2个字符").max(50, "用户名不能超过50个字符"),
  password: z.string().min(6, "密码至少6个字符").max(50, "密码不能超过50个字符").optional(),
  real_name: z.string().min(1, "姓名不能为空").max(50, "姓名不能超过50个字符"),
  role: z.enum(["teacher", "class_teacher"], { required_error: "请选择角色" }),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号").optional().or(z.literal("")),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  is_active: z.number().int().min(0).max(1),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

interface TeacherFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teacher?: TeacherWithClass;
}

const TEACHER_ROLES = [
  { value: "teacher", label: "教师" },
  { value: "class_teacher", label: "班主任" },
];

export function TeacherForm({ open, onClose, onSuccess, teacher }: TeacherFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!teacher;

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      username: teacher?.username || "",
      password: "",
      real_name: teacher?.real_name || "",
      role: teacher?.role || "teacher",
      phone: teacher?.phone || "",
      email: teacher?.email || "",
      is_active: teacher?.is_active ?? 1,
    },
  });

  const onSubmit = async (values: TeacherFormValues) => {
    setIsSubmitting(true);
    try {
      let url: string;
      let method: string;

      if (isEdit && teacher) {
        url = `/api/teachers/${teacher.id}`;
        method = "PUT";
      } else {
        url = "/api/teachers";
        method = "POST";
      }

      // 准备提交数据
      const submitData: Record<string, unknown> = {
        username: values.username,
        real_name: values.real_name,
        role: values.role,
        phone: values.phone || null,
        email: values.email || null,
        is_active: values.is_active,
      };

      // 只有在编辑时且输入了新密码才发送密码字段
      if (isEdit && values.password) {
        submitData.password = values.password;
      }
      // 创建时必须有密码
      if (!isEdit) {
        submitData.password = values.password || "123456";
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "操作失败");
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error("Submit teacher error:", error);
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
          <DialogTitle>{isEdit ? "编辑教师" : "新增教师"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改教师信息。如需修改密码，请输入新密码。" : "创建新的教师账号。默认密码为 123456。"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="teacher-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入用户名" {...field} disabled={isEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="real_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>真实姓名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入真实姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEdit ? "新密码（留空不修改）" : "密码 *"}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEdit ? "留空则不修改密码" : "请输入密码"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择角色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEACHER_ROLES.map(({ value, label }) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="请输入邮箱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>启用状态</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      禁用后教师将无法登录系统
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 1}
                      onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                    />
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
          <Button type="submit" form="teacher-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
