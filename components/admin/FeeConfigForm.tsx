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
import type { FeeConfig, Semester, ClassWithDetails } from "@/types";

const feeConfigSchema = z.object({
  semester_id: z.coerce.number().min(1, "请选择学期"),
  class_id: z.coerce.number().min(1, "请选择班级"),
  meal_fee_standard: z.coerce
    .number()
    .min(0.01, "餐费标准必须大于0")
    .max(9999.99, "餐费标准不能超过9999.99"),
  prepaid_days: z.coerce.number().min(0, "预收天数不能为负数").int("预收天数必须是整数"),
  actual_days: z.coerce.number().min(0, "实收天数不能为负数").int("实收天数必须是整数"),
  suspension_days: z.coerce.number().min(0, "停课天数不能为负数").int("停课天数必须是整数"),
});

type FeeConfigFormValues = z.infer<typeof feeConfigSchema>;

interface FeeConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  feeConfig?: FeeConfig;
}

export function FeeConfigForm({ open, onClose, onSuccess, feeConfig }: FeeConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [currentSemesterName, setCurrentSemesterName] = useState<string>("");
  const [semesterLoading, setSemesterLoading] = useState(true);
  const isEdit = !!feeConfig;

  const form = useForm<FeeConfigFormValues>({
    resolver: zodResolver(feeConfigSchema),
    defaultValues: {
      semester_id: 0,
      class_id: 0,
      meal_fee_standard: 0,
      prepaid_days: 0,
      actual_days: 0,
      suspension_days: 0,
    },
  });

  // 只在 feeConfig 或 currentSemesterId 变化时重置表单
  useEffect(() => {
    if (feeConfig) {
      form.reset({
        semester_id: feeConfig.semester_id,
        class_id: feeConfig.class_id,
        meal_fee_standard: feeConfig.meal_fee_standard,
        prepaid_days: feeConfig.prepaid_days,
        actual_days: feeConfig.actual_days,
        suspension_days: feeConfig.suspension_days,
      });
    } else if (currentSemesterId) {
      // 新增时，使用当前学期作为默认值，并获取该学期的班级
      form.reset({
        semester_id: currentSemesterId,
        class_id: 0,
        meal_fee_standard: 0,
        prepaid_days: 0,
        actual_days: 0,
        suspension_days: 0,
      });
      // 获取当前学期的班级列表
      fetch(`/api/classes?semester_id=${currentSemesterId}`)
        .then((res) => res.json())
        .then((data) => {
          setClasses(data.data || []);
        })
        .catch((error) => {
          console.error("Fetch classes error:", error);
        });
    } else {
      form.reset({
        semester_id: 0,
        class_id: 0,
        meal_fee_standard: 0,
        prepaid_days: 0,
        actual_days: 0,
        suspension_days: 0,
      });
    }
  }, [feeConfig, currentSemesterId]);

  // 获取当前学期
  useEffect(() => {
    fetchCurrentSemester();
  }, []);

  // 当对话框打开时，新增模式重置学期
  useEffect(() => {
    if (open && !feeConfig) {
      fetchCurrentSemester();
    }
  }, [open]);

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      const currentSemester = data.data?.find((s: { is_current: number }) => s.is_current === 1);
      if (currentSemester) {
        setCurrentSemesterId(currentSemester.id);
        setCurrentSemesterName(currentSemester.name);
        // 新增时自动设置当前学期
        if (!feeConfig) {
          form.setValue("semester_id", currentSemester.id);
        }
      }
    } catch (error) {
      console.error("获取当前学期失败:", error);
    } finally {
      setSemesterLoading(false);
    }
  };

  const onSubmit = async (values: FeeConfigFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/fee-configs/${feeConfig.id}` : "/api/fee-configs";
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
        console.error("Submit fee config error:", error);
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
          <DialogTitle>{isEdit ? "编辑费用配置" : "新增费用配置"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改费用配置信息" : "为班级设置餐费标准和相关天数"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="fee-config-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <div className="text-sm text-muted-foreground">已设置（ID: {feeConfig?.semester_id})</div>
              </div>
            )}

            <FormField
              control={form.control}
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>班级 *</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    value={field.value === 0 ? "" : field.value.toString()}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择班级" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.grade_name} {cls.name}
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
              name="meal_fee_standard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>餐费标准（元/天）*</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0.01" max="9999.99" placeholder="例如：15.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="prepaid_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>预收天数 *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>实收天数 *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="suspension_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>停课天数 *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              退费计算公式：退费金额 = 餐费标准 × (预收天数 - 实收天数 + 停课天数 + 请假天数)
            </p>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="submit" form="fee-config-form" disabled={isSubmitting || (!currentSemesterId && !isEdit)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
