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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { StudentSelector } from "@/components/shared/StudentSelector";
import type { User, LeaveWithDetails } from "@/types";

interface SemesterOption {
  id: number;
  name: string;
  is_current: number;
  school_days: number;
}

// 创建动态验证 schema 的工厂函数
const createLeaveSchema = (minLeaveDays: number, semesterOptions: SemesterOption[], includeStatus: boolean = false) => {
  let schema = z.object({
    student_id: z.coerce.number().int().positive("请选择学生"),
    semester_id: z.coerce.number().int().positive("请选择学期"),
    start_date: z.string().min(1, "请选择开始日期"),
    end_date: z.string().min(1, "请选择结束日期"),
    leave_days: z.coerce.number().int().min(1, "请输入请假天数"),
    reason: z.string().min(1, "请假事由不能为空").max(500, "请假事由不能超过500个字符"),
  });

  if (includeStatus) {
    schema = schema.extend({
      status: z.enum(["pending", "approved", "rejected"]).optional(),
    });
  }

  return schema
    .refine((data) => data.start_date <= data.end_date, {
      message: "结束日期不能早于开始日期",
      path: ["end_date"],
    })
    .superRefine((data, ctx) => {
      // 请假天数必须大于最小天数（从系统配置获取）
      if (data.leave_days <= minLeaveDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `请假天数必须大于${minLeaveDays}天`,
          path: ["leave_days"],
        });
      }

      // 获取选中学期的总天数
      const selectedSemester = semesterOptions?.find((s) => s.id === data.semester_id);
      if (selectedSemester && data.leave_days > selectedSemester.school_days) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `请假天数不能超过学期总天数（${selectedSemester.school_days}天）`,
          path: ["leave_days"],
        });
      }

      // 请假天数不能大于日期范围的自然天数
      if (data.start_date && data.end_date) {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        const dayDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (data.leave_days > dayDiff) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `请假天数不能超过日期范围（${dayDiff}天）`,
            path: ["leave_days"],
          });
        }
      }
    });
};

type LeaveFormValues = z.infer<ReturnType<typeof createLeaveSchema>>;

interface LeaveFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultClassId?: number;
  editingLeave?: LeaveWithDetails;
  mode?: "create" | "edit";
  currentUser?: User | null;
}

export function LeaveForm({ open, onClose, onSuccess, defaultClassId, editingLeave, mode = "create", currentUser }: LeaveFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
  const [minLeaveDays, setMinLeaveDays] = useState(3); // 默认值
  const [teacherClassId, setTeacherClassId] = useState<number | undefined>(defaultClassId);

  // 判断是否包含状态选择（仅管理员编辑模式）
  const includeStatus = currentUser?.role === "admin" && mode === "edit";

  const form = useForm({
    resolver: zodResolver(createLeaveSchema(minLeaveDays, semesterOptions, includeStatus)),
    defaultValues: {
      student_id: 0,
      semester_id: 0,
      start_date: "",
      end_date: "",
      leave_days: 0,
      reason: "",
      ...(includeStatus && { status: undefined as "pending" | "approved" | "rejected" | undefined }),
    },
  });

  // 加载学期列表和系统配置
  useEffect(() => {
    if (open) {
      fetchCurrentUser();
      fetchSemesters();
      fetchSystemConfig();

      // 编辑模式下设置初始值
      if (mode === "edit" && editingLeave) {
        form.reset({
          student_id: editingLeave.student_id,
          semester_id: editingLeave.semester_id,
          start_date: editingLeave.start_date,
          end_date: editingLeave.end_date,
          leave_days: editingLeave.leave_days,
          reason: editingLeave.reason,
          ...(includeStatus && { status: editingLeave.status as "pending" | "approved" | "rejected" }),
        });
      }
    }
  }, [open, mode, editingLeave, includeStatus]);

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (response.ok && data.user) {
        const user = data.user as User;

        // 如果是班主任，获取其管理的班级ID
        if (user.role === "class_teacher" && !defaultClassId) {
          fetchTeacherClassId();
        }
      }
    } catch (error) {
      console.error("Fetch current user error:", error);
    }
  };

  // 获取班主任管理的班级ID
  const fetchTeacherClassId = async () => {
    try {
      const response = await fetch("/api/class-teacher/class");
      const data = await response.json();
      if (response.ok && data.data?.id) {
        setTeacherClassId(data.data.id);
      }
    } catch (error) {
      console.error("Fetch teacher class error:", error);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const response = await fetch("/api/system-config/leave.min_days");
      const data = await response.json();
      if (data.data?.config_value) {
        setMinLeaveDays(parseInt(data.data.config_value, 10) || 3);
      }
    } catch (error) {
      console.error("Failed to fetch system config:", error);
    }
  };

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      setSemesterOptions(data.data || []);

      // 自动选择当前学期
      const currentSemester = data.data?.find((s: SemesterOption) => s.is_current === 1);
      if (currentSemester) {
        form.setValue("semester_id", currentSemester.id);
      }
    } catch (error) {
      console.error("Fetch semesters error:", error);
    }
  };

  // 当学期列表更新时，同步更新 form context
  useEffect(() => {
    form.setValue("semester_id", form.watch("semester_id")); // 触发重新验证
  }, [semesterOptions]);

  const handleStudentChange = (studentId: number) => {
    form.setValue("student_id", studentId);
  };

  const onSubmit = async (values: LeaveFormValues) => {
    setIsSubmitting(true);
    try {
      const url = mode === "edit" && editingLeave ? `/api/leaves/${editingLeave.id}` : "/api/leaves";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "提交失败");
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error("Submit leave error:", error);
      form.setError("root", {
        message: error instanceof Error ? error.message : "提交失败，请稍后重试",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const semesterId = form.watch("semester_id");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "编辑请假申请" : "新增请假申请"}</DialogTitle>
          <DialogDescription>填写学生请假信息，系统将自动计算退费金额</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 学期选择 */}
            <FormField
              control={form.control}
              name="semester_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学期 *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={field.value ? String(field.value) : ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择学期" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {semesterOptions.map((semester) => (
                        <SelectItem key={semester.id} value={String(semester.id)}>
                          {semester.name}
                          {semester.is_current === 1 && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              当前
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 学生选择 */}
            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学生 *</FormLabel>
                  <FormControl>
                    <StudentSelector
                      value={field.value}
                      onChange={handleStudentChange}
                      semesterId={semesterId}
                      classId={teacherClassId}
                      placeholder="请选择学生"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 日期选择 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>开始日期 *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "yyyy-MM-dd")
                            ) : (
                              <span>请选择日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(format(date, "yyyy-MM-dd"));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>结束日期 *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "yyyy-MM-dd")
                            ) : (
                              <span>请选择日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(format(date, "yyyy-MM-dd"));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 请假天数 */}
            <FormField
              control={form.control}
              name="leave_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>请假天数 * </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={`请输入请假天数（必须大于${minLeaveDays}天）`}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 请假事由 */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>请假事由 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入请假事由"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 状态选择 - 仅管理员编辑模式显示 */}
            {includeStatus && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>审核状态</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v as "pending" | "approved" | "rejected")} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">待审核</SelectItem>
                        <SelectItem value="approved">已批准</SelectItem>
                        <SelectItem value="rejected">已拒绝</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.formState.errors.root && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                {form.formState.errors.root.message}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "edit" ? "保存修改" : "提交申请"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
