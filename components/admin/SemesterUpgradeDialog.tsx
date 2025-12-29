"use client";

import { useState, useCallback, useEffect } from "react";
import { GraduationCap, Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Semester, UpgradePreview } from "@/types";

interface SemesterUpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allSemesters: Semester[];
}

type UpgradeStep = "select-semester" | "select-grade" | "confirm" | "processing" | "result";

interface SelectedGradesInfo {
  [gradeId: number]: boolean;
}

export function SemesterUpgradeDialog({
  open,
  onClose,
  onSuccess,
  allSemesters,
}: SemesterUpgradeDialogProps) {
  const [step, setStep] = useState<UpgradeStep>("select-semester");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [sourceSemesterId, setSourceSemesterId] = useState<number | null>(null);
  const [targetSemesterId, setTargetSemesterId] = useState<number | null>(null);
  const [selectedGrades, setSelectedGrades] = useState<SelectedGradesInfo>({});
  const [result, setResult] = useState<{
    grades_created: number;
    classes_created: number;
    students_created: number;
    warnings?: string[];
  } | null>(null);

  // 重置状态
  const resetState = useCallback(() => {
    setStep("select-semester");
    setPreview(null);
    setSourceSemesterId(null);
    setTargetSemesterId(null);
    setSelectedGrades({});
    setResult(null);
    setLoading(false);
  }, []);

  // 对话框关闭时重置
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  // 获取升级预览
  const fetchPreview = async () => {
    if (!sourceSemesterId || !targetSemesterId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/semesters/upgrade?source_semester_id=${sourceSemesterId}&target_semester_id=${targetSemesterId}`
      );
      if (!response.ok) {
        throw new Error("获取预览失败");
      }
      const data = await response.json();
      setPreview(data.data);

      // 预选所有年级
      const initialSelection: SelectedGradesInfo = {};
      data.data.available_grades.forEach((g: { id: number }) => {
        initialSelection[g.id] = true;
      });
      setSelectedGrades(initialSelection);
    } catch (error) {
      console.error("获取预览失败:", error);
      alert("获取升级预览失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 选择学期后进入下一步
  const handleSemesterNext = async () => {
    if (!sourceSemesterId || !targetSemesterId) {
      alert("请选择源学期和目标学期");
      return;
    }

    if (sourceSemesterId === targetSemesterId) {
      alert("源学期和目标学期不能相同");
      return;
    }

    await fetchPreview();
    setStep("select-grade");
  };

  // 切换年级选择
  const toggleGrade = (gradeId: number) => {
    setSelectedGrades((prev) => ({
      ...prev,
      [gradeId]: !prev[gradeId],
    }));
  };

  // 全选/取消全选
  const toggleAll = () => {
    if (!preview) return;

    const allSelected = preview.available_grades.every((g) => selectedGrades[g.id]);
    if (allSelected) {
      // 取消全选
      const newSelection: SelectedGradesInfo = {};
      preview.available_grades.forEach((g) => {
        newSelection[g.id] = false;
      });
      setSelectedGrades(newSelection);
    } else {
      // 全选
      const newSelection: SelectedGradesInfo = {};
      preview.available_grades.forEach((g) => {
        newSelection[g.id] = true;
      });
      setSelectedGrades(newSelection);
    }
  };

  // 计算选中的年级预览数据
  const getSelectedPreviewData = () => {
    if (!preview) return [];

    return preview.available_grades
      .filter((g) => selectedGrades[g.id])
      .map((g) => {
        // 提取年级名称中的数字并+1
        const match = g.name.match(/(\d+)/);
        let newGradeName = g.name;
        if (match) {
          const number = parseInt(match[1], 10);
          newGradeName = g.name.replace(match[1], (number + 1).toString());
        }

        return {
          old_grade: g.name,
          new_grade: newGradeName,
          class_count: g.class_count,
          student_count: g.student_count,
        };
      });
  };

  // 执行升级
  const handleUpgrade = async () => {
    if (!sourceSemesterId || !targetSemesterId) return;

    const selectedGradeIds = Object.entries(selectedGrades)
      .filter(([, selected]) => selected)
      .map(([id]) => parseInt(id, 10));

    if (selectedGradeIds.length === 0) {
      alert("请至少选择一个年级");
      return;
    }

    setStep("processing");
    setLoading(true);

    try {
      const response = await fetch("/api/semesters/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_semester_id: sourceSemesterId,
          target_semester_id: targetSemesterId,
          grade_ids: selectedGradeIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "升级失败");
      }

      const data = await response.json();
      setResult(data.data);
      setStep("result");
    } catch (error) {
      console.error("升级失败:", error);
      alert(error instanceof Error ? error.message : "升级失败，请稍后重试");
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  // 关闭对话框
  const handleClose = () => {
    if (step === "result") {
      onSuccess();
    }
    resetState();
    onClose();
  };

  // 渲染选择学期步骤
  const renderSelectSemesterStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="source-semester">源学期 *</Label>
        <Select value={sourceSemesterId?.toString() || ""} onValueChange={(v) => setSourceSemesterId(parseInt(v, 10))}>
          <SelectTrigger id="source-semester">
            <SelectValue placeholder="选择源学期" />
          </SelectTrigger>
          <SelectContent>
            {allSemesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id.toString()}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">选择要从中复制学生的学期</p>
      </div>

      <div className="flex items-center justify-center">
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="target-semester">目标学期 *</Label>
        <Select value={targetSemesterId?.toString() || ""} onValueChange={(v) => setTargetSemesterId(parseInt(v, 10))}>
          <SelectTrigger id="target-semester">
            <SelectValue placeholder="选择目标学期" />
          </SelectTrigger>
          <SelectContent>
            {allSemesters
              .filter((s) => s.id !== sourceSemesterId)
              .map((semester) => (
                <SelectItem key={semester.id} value={semester.id.toString()}>
                  {semester.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">选择将学生复制到的新学期（需提前创建）</p>
      </div>
    </div>
  );

  // 渲染选择年级步骤
  const renderSelectGradeStep = () => {
    if (loading || !preview) {
      return (
        <div className="space-y-4 text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">正在加载年级信息...</p>
        </div>
      );
    }

    if (preview.available_grades.length === 0) {
      return (
        <div className="space-y-4 text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-500" />
          <p className="text-lg font-medium">源学期没有年级数据</p>
        </div>
      );
    }

    const selectedCount = Object.values(selectedGrades).filter((v) => v).length;
    const allSelected = preview.available_grades.every((g) => selectedGrades[g.id]);

    return (
      <div className="space-y-4">
        {/* 源学期和目标学期信息 */}
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1 text-center">
            <p className="text-sm text-muted-foreground">源学期</p>
            <p className="font-semibold">{preview.source_semester.name}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-center">
            <p className="text-sm text-muted-foreground">目标学期</p>
            <p className="font-semibold">{preview.target_semester.name}</p>
          </div>
        </div>

        {/* 全选按钮 */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <Label className="cursor-pointer flex items-center gap-2">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span>全选所有年级</span>
          </Label>
          <Badge variant="secondary">已选 {selectedCount} / {preview.available_grades.length}</Badge>
        </div>

        {/* 年级列表 */}
        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="p-4 space-y-2">
            {preview.available_grades.map((grade) => {
              const match = grade.name.match(/(\d+)/);
              let newGradeName = grade.name;
              if (match) {
                const number = parseInt(match[1], 10);
                newGradeName = grade.name.replace(match[1], (number + 1).toString());
              }

              return (
                <div
                  key={grade.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedGrades[grade.id] || false}
                    onCheckedChange={() => toggleGrade(grade.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{grade.name}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge>{newGradeName}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {grade.class_count} 个班级 · {grade.student_count} 名学生
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* 注意事项 */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            <strong>注意：</strong>
            升级后年级名称自动递增（1→2，2→3），班级班主任为空需要手动分配。
          </p>
        </div>
      </div>
    );
  };

  // 渲染确认步骤
  const renderConfirmStep = () => {
    const previewData = getSelectedPreviewData();
    const selectedCount = previewData.length;
    const totalClasses = previewData.reduce((sum, g) => sum + g.class_count, 0);
    const totalStudents = previewData.reduce((sum, g) => sum + g.student_count, 0);

    return (
      <div className="space-y-4">
        {/* 学期信息 */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">源学期</span>
            <span className="text-sm font-medium">{preview?.source_semester.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">目标学期</span>
            <span className="text-sm font-medium">{preview?.target_semester.name}</span>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{selectedCount}</p>
            <p className="text-sm text-muted-foreground">年级</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{totalClasses}</p>
            <p className="text-sm text-muted-foreground">班级</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{totalStudents}</p>
            <p className="text-sm text-muted-foreground">学生</p>
          </div>
        </div>

        {/* 年级映射详情 */}
        <ScrollArea className="h-[200px] border rounded-lg">
          <div className="p-4">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2 font-medium">原年级</th>
                  <th className="text-left p-2 font-medium"></th>
                  <th className="text-left p-2 font-medium">新年级</th>
                  <th className="text-right p-2 font-medium">班级数</th>
                  <th className="text-right p-2 font-medium">学生数</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">
                      <Badge variant="outline">{item.old_grade}</Badge>
                    </td>
                    <td className="p-2 text-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                    </td>
                    <td className="p-2">
                      <Badge>{item.new_grade}</Badge>
                    </td>
                    <td className="p-2 text-right">{item.class_count}</td>
                    <td className="p-2 text-right">{item.student_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        {/* 警告 */}
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            <strong>重要：</strong>此操作不可撤销，请确认信息无误后执行。
          </p>
        </div>
      </div>
    );
  };

  // 渲染处理中步骤
  const renderProcessingStep = () => (
    <div className="space-y-4 text-center py-8">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
      <p className="text-lg font-medium">正在执行升级...</p>
      <p className="text-sm text-muted-foreground">请稍候，这可能需要一些时间</p>
      <Progress value={66} className="mx-auto max-w-xs" />
    </div>
  );

  // 渲染结果步骤
  const renderResultStep = () => (
    <div className="space-y-4 text-center py-4">
      <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
      <div>
        <p className="text-lg font-medium">升级完成！</p>
        <p className="text-sm text-muted-foreground mt-1">
          学生已从 {preview?.source_semester.name} 复制到 {preview?.target_semester.name}
        </p>
      </div>

      <div className="flex justify-center gap-6 py-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{result?.grades_created || 0}</p>
          <p className="text-sm text-muted-foreground">新建年级</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{result?.classes_created || 0}</p>
          <p className="text-sm text-muted-foreground">班级</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-purple-600">{result?.students_created || 0}</p>
          <p className="text-sm text-muted-foreground">学生</p>
        </div>
      </div>

      {result?.warnings && result.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg text-left">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">警告：</p>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            {result.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <GraduationCap className="h-4 w-4 inline mr-2" />
          提醒：请为各班级分配班主任
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            学生升级到新学期
          </DialogTitle>
          <DialogDescription>
            {step === "select-semester" && "选择源学期和目标学期"}
            {step === "select-grade" && "选择要升级的年级"}
            {step === "confirm" && "确认升级信息"}
            {step === "processing" && "正在执行升级操作"}
            {step === "result" && "升级已完成"}
          </DialogDescription>
        </DialogHeader>

        {step === "select-semester" && renderSelectSemesterStep()}
        {step === "select-grade" && renderSelectGradeStep()}
        {step === "confirm" && renderConfirmStep()}
        {step === "processing" && renderProcessingStep()}
        {step === "result" && renderResultStep()}

        <DialogFooter>
          {step === "select-semester" && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                取消
              </Button>
              <Button onClick={handleSemesterNext} disabled={!sourceSemesterId || !targetSemesterId || loading}>
                下一步
              </Button>
            </>
          )}
          {step === "select-grade" && (
            <>
              <Button variant="outline" onClick={() => setStep("select-semester")} disabled={loading}>
                上一步
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={Object.values(selectedGrades).filter((v) => v).length === 0 || loading}
              >
                下一步 ({Object.values(selectedGrades).filter((v) => v).length} 个年级)
              </Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("select-grade")} disabled={loading}>
                上一步
              </Button>
              <Button onClick={handleUpgrade} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    确认升级
                  </>
                )}
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={handleClose}>完成</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
