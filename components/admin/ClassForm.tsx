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
import { Loader2 } from "lucide-react";
import type { Class, Grade, Semester, User } from "@/types";

const classSchema = z.object({
  semester_id: z.coerce.number().min(1, "请选择学期"),
  grade_id: z.coerce.number().min(1, "请选择年级"),
  name: z.string().min(1, "班级名称不能为空").max(20, "班级名称不能超过20个字符"),
  class_teacher_id: z.coerce.number().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface ClassFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classData?: Class;
}

export function ClassForm({ open, onClose, onSuccess, classData }: ClassFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const isEdit = !!classData;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      semester_id: 0,
      grade_id: 0,
      name: "",
      class_teacher_id: undefined,
    },
  });

  useEffect(() => {
    if (classData) {
      form.reset({
        semester_id: classData.semester_id,
        grade_id: classData.grade_id,
        name: classData.name,
        class_teacher_id: classData.class_teacher_id,
      });
    } else {
      form.reset({
        semester_id: 0,
        grade_id: 0,
        name: "",
        class_teacher_id: undefined,
      });
    }
  }, [classData, form]);

  const fetchOptions = async (semesterId?: number) => {
    setLoading(true);
    try {
      const [semestersRes, teachersRes] = await Promise.all([
        fetch("/api/semesters"),
        fetch("/api/users?role=teacher,class_teacher"),
      ]);

      const semestersData = await semestersRes.json();
      const teachersData = await teachersRes.json();

      setSemesters(semestersData.data || []);
      setTeachers(teachersData.data || []);

      // 如果有学期ID，获取该学期下的年级
      if (semesterId) {
        const gradesRes = await fetch(`/api/grades?semester_id=${semesterId}`);
        const gradesData = await gradesRes.json();
        setGrades(gradesData.data || []);
      }
    } catch (error) {
      console.error("Fetch options error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOptions(classData?.semester_id);
    }
  }, [open]);

  // 当学期改变时，重新获取年级列表
  const handleSemesterChange = (semesterId: number) => {
    form.setValue("semester_id", semesterId);
    form.setValue("grade_id", 0); // 重置年级选择
    setGrades([]);

    if (semesterId) {
      fetch(`/api/grades?semester_id=${semesterId}`)
        .then((res) => res.json())
        .then((data) => {
          setGrades(data.data || []);
        })
        .catch((error) => {
          console.error("Fetch grades error:", error);
        });
    }
  };

  const onSubmit = async (values: ClassFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/classes/${classData.id}` : "/api/classes";
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
      console.error("Submit class error:", error);
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
          <DialogTitle>{isEdit ? "编辑班级" : "新增班级"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改班级信息" : "创建新的班级"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="class-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <FormField
              control={form.control}
              name="semester_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属学期 *</FormLabel>
                  <Select
                    onValueChange={(v) => handleSemesterChange(parseInt(v, 10))}
                    value={field.value.toString()}
                    disabled={loading || isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择学期" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id.toString()}>
                          {semester.name}
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
              name="grade_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属年级 *</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    value={field.value.toString()}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请先选择学期，再选择年级" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id.toString()}>
                          {grade.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>班级名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：1班" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="class_teacher_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>班主任</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "0" ? undefined : parseInt(v, 10))}
                    value={field.value?.toString() || "0"}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择班主任（可选）" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">无</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.real_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <Button type="submit" form="class-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
