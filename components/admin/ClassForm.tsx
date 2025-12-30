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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Class, Grade, Semester, User } from "@/types";

const classSchema = z.object({
  semester_id: z.coerce.number().min(1, "请选择学期"),
  grade_id: z.coerce.number().min(1, "请选择年级"),
  name: z.string().min(1, "班级名称不能为空").max(20, "班级名称不能超过20个字符"),
  class_teacher_id: z.coerce.number().nullable().optional(),
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
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [currentSemesterName, setCurrentSemesterName] = useState<string>("");
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [semesterName, setSemesterName] = useState<string>("");
  const [allSemesters, setAllSemesters] = useState<Array<{ id: number; name: string }>>([]);
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

  // 只在 classData 或 currentSemesterId 变化时重置表单
  useEffect(() => {
    if (classData) {
      form.reset({
        semester_id: classData.semester_id,
        grade_id: classData.grade_id,
        name: classData.name,
        class_teacher_id: classData.class_teacher_id,
      });
      // 编辑模式下，根据 semester_id 获取学期名称
      const semester = allSemesters.find(s => s.id === classData.semester_id);
      if (semester) {
        setSemesterName(semester.name);
      }
      // 获取该学期的年级列表
      fetch(`/api/grades?semester_id=${classData.semester_id}`)
        .then((res) => res.json())
        .then((data) => {
          setGrades(data.data || []);
        })
        .catch((error) => {
          console.error("Fetch grades error:", error);
        });
    } else if (currentSemesterId) {
      // 新增时，使用当前学期作为默认值，并获取该学期的年级
      form.reset({
        semester_id: currentSemesterId,
        grade_id: 0,
        name: "",
        class_teacher_id: undefined,
      });
      // 获取当前学期的年级列表
      fetch(`/api/grades?semester_id=${currentSemesterId}`)
        .then((res) => res.json())
        .then((data) => {
          setGrades(data.data || []);
        })
        .catch((error) => {
          console.error("Fetch grades error:", error);
        });
    } else {
      form.reset({
        semester_id: 0,
        grade_id: 0,
        name: "",
        class_teacher_id: undefined,
      });
    }
  }, [classData, currentSemesterId, allSemesters]);

  // 获取当前学期
  useEffect(() => {
    fetchCurrentSemester();
    fetchTeachers();
  }, []);

  // 当对话框打开时，新增模式重置学期
  useEffect(() => {
    if (open && !classData) {
      fetchCurrentSemester();
    }
  }, [open]);

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      // 保存所有学期数据
      setAllSemesters(data.data || []);
      const currentSemester = data.data?.find((s: { is_current: boolean }) => s.is_current === true);
      if (currentSemester) {
        setCurrentSemesterId(currentSemester.id);
        setCurrentSemesterName(currentSemester.name);
        // 新增时自动设置当前学期
        if (!classData) {
          form.setValue("semester_id", currentSemester.id);
        }
      }
    } catch (error) {
      console.error("获取当前学期失败:", error);
    } finally {
      setSemesterLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/users?role=teacher,class_teacher");
      const data = await response.json();
      setTeachers(data.data || []);
    } catch (error) {
      console.error("Fetch teachers error:", error);
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
        // 400 是业务验证错误，不需要控制台输出
        // 500 等才是真正的系统错误
        const error = new Error(data.error || "操作失败");
        Object.assign(error, { status: response.status });
        throw error;
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error: unknown) {
      // 只在非 400 错误时才输出到控制台
      const err = error as { status?: number };
      if (err.status !== 400) {
        console.error("Submit class error:", error);
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

            {/* 无当前学期提示（仅新增模式） */}
            {!currentSemesterId && !semesterLoading && !isEdit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>未设置当前学期</AlertTitle>
                <AlertDescription>
                  请先在学期管理中设置一个当前学期，然后重新打开此表单。
                </AlertDescription>
              </Alert>
            )}

            {/* 当前学期显示 */}
            {currentSemesterId && !isEdit && (
              <div className="rounded-md bg-muted p-3">
                <div className="text-sm font-medium">当前学期</div>
                <div className="text-sm text-muted-foreground">{currentSemesterName}</div>
              </div>
            )}

            {/* 编辑模式显示所属学期 */}
            {isEdit && (
              <div className="rounded-md bg-muted p-3">
                <div className="text-sm font-medium">所属学期</div>
                <div className="text-sm text-muted-foreground">
                  {semesterName || semesterLoading ? semesterName : `已设置（ID: ${classData?.semester_id}）`}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="grade_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属年级 *</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    value={field.value === 0 ? "" : field.value.toString()}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择年级" />
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
                    onValueChange={(v) => field.onChange(v === "0" ? null : parseInt(v, 10))}
                    value={field.value === null ? "0" : (field.value?.toString() || "")}
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
          <Button type="submit" form="class-form" disabled={isSubmitting || (!currentSemesterId && !isEdit)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
