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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { GENDERS } from "@/lib/constants";
import type { StudentWithDetails } from "@/types";

const studentSchema = z.object({
  student_no: z.string().min(1, "学号不能为空").max(30, "学号不能超过30个字符"),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名不能超过50个字符"),
  gender: z.enum(["男", "女"]).optional(),
  class_id: z.coerce.number().int().positive("请选择班级"),
  birth_date: z.string().optional(),
  parent_name: z.string().max(50, "家长姓名不能超过50个字符").optional(),
  parent_phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号").optional().or(z.literal("")),
  address: z.string().max(200, "地址不能超过200个字符").optional(),
  is_nutrition_meal: z.number().int().min(0).max(1),
  enrollment_date: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student?: StudentWithDetails;
}

interface ClassOption {
  id: number;
  name: string;
  grade_name: string;
}

export function StudentForm({ open, onClose, onSuccess, student }: StudentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const isEdit = !!student;

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_no: "",
      name: "",
      gender: undefined,
      class_id: 0,
      birth_date: "",
      parent_name: "",
      parent_phone: "",
      address: "",
      is_nutrition_meal: 0,
      enrollment_date: "",
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        student_no: student.student_no,
        name: student.name,
        gender: (student.gender === "男" || student.gender === "女") ? student.gender : undefined,
        class_id: student.class_id,
        birth_date: student.birth_date || "",
        parent_name: student.parent_name || "",
        parent_phone: student.parent_phone || "",
        address: student.address || "",
        is_nutrition_meal: student.is_nutrition_meal ?? 0,
        enrollment_date: student.enrollment_date || "",
      });
    } else {
      form.reset({
        student_no: "",
        name: "",
        gender: undefined,
        class_id: 0,
        birth_date: "",
        parent_name: "",
        parent_phone: "",
        address: "",
        is_nutrition_meal: 0,
        enrollment_date: "",
      });
    }
  }, [student, form]);

  // 加载班级列表
  useEffect(() => {
    if (open) {
      fetchClasses();
    }
  }, [open]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await fetch("/api/classes");
      const data = await response.json();
      setClassOptions(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const onSubmit = async (values: StudentFormValues) => {
    setIsSubmitting(true);
    try {
      let url: string;
      let method: string;

      if (isEdit && student) {
        url = `/api/students/${student.id}`;
        method = "PUT";
      } else {
        url = "/api/students";
        method = "POST";
      }

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
        console.error("Submit student error:", error);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑学生" : "新增学生"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改学生信息" : "创建新的学生档案"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="student-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="student_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>学号 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入学号" {...field} disabled={isEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>性别</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "未填写"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择性别" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="未填写">未填写</SelectItem>
                        {Object.values(GENDERS).map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
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
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>班级 *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString() || "0"}>
                      <FormControl>
                        <SelectTrigger disabled={loadingClasses}>
                          <SelectValue placeholder="请选择班级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classOptions.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.grade_name} - {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>出生日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enrollment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>入学日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parent_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>家长姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入家长姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>家长手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入家长手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>家庭住址</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入家庭住址" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_nutrition_meal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>营养餐学生</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      标记为营养餐学生后，请假时不予退费
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
          <Button type="submit" form="student-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
