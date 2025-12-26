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
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
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
  }, [feeConfig, form]);

  const fetchOptions = async (semesterId?: number) => {
    setLoading(true);
    try {
      const semestersRes = await fetch("/api/semesters");
      const semestersData = await semestersRes.json();
      setSemesters(semestersData.data || []);

      // 如果有学期ID，获取该学期下的班级
      if (semesterId) {
        const classesRes = await fetch(`/api/classes?semester_id=${semesterId}`);
        const classesData = await classesRes.json();
        setClasses(classesData.data || []);
      }
    } catch (error) {
      console.error("Fetch options error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOptions(feeConfig?.semester_id);
    }
  }, [open]);

  // 当学期改变时，重新获取班级列表
  const handleSemesterChange = (semesterId: number) => {
    form.setValue("semester_id", semesterId);
    form.setValue("class_id", 0); // 重置班级选择
    setClasses([]);

    if (semesterId) {
      fetch(`/api/classes?semester_id=${semesterId}`)
        .then((res) => res.json())
        .then((data) => {
          setClasses(data.data || []);
        })
        .catch((error) => {
          console.error("Fetch classes error:", error);
        });
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
        throw new Error(data.error || "操作失败");
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error("Submit fee config error:", error);
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
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>班级 *</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    value={field.value.toString()}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请先选择学期，再选择班级" />
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
          <Button type="submit" form="fee-config-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
