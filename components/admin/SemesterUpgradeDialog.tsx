"use client";

import { useState, useCallback, useEffect } from "react";
import { GraduationCap, Loader2, CheckCircle, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";
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
import type { Semester, UpgradePreview, ClassTeacherMappingPreview } from "@/types";

interface SemesterUpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allSemesters: Semester[];
}

type UpgradeStep = "select-mode" | "select-semester" | "select-grade" | "teacher-preview" | "confirm" | "processing" | "result";
type UpgradeMode = "semester" | "year";

interface SelectedGradesInfo {
  [gradeId: number]: boolean;
}

export function SemesterUpgradeDialog({
  open,
  onClose,
  onSuccess,
  allSemesters,
}: SemesterUpgradeDialogProps) {
  const [step, setStep] = useState<UpgradeStep>("select-mode");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [sourceSemesterId, setSourceSemesterId] = useState<number | null>(null);
  const [targetSemesterId, setTargetSemesterId] = useState<number | null>(null);
  const [selectedGrades, setSelectedGrades] = useState<SelectedGradesInfo>({});
  const [upgradeMode, setUpgradeMode] = useState<UpgradeMode>("year");
  const [gradeNameOverrides, setGradeNameOverrides] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{
    grades_created: number;
    classes_created: number;
    students_created: number;
    graduated_students_count?: number;
    skipped_count?: number;
    warnings?: string[];
  } | null>(null);

  // 重置状态
  const resetState = useCallback(() => {
    setStep("select-mode");
    setUpgradeMode("year");
    setPreview(null);
    setSourceSemesterId(null);
    setTargetSemesterId(null);
    setSelectedGrades({});
    setGradeNameOverrides({});
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
        `/api/semesters/upgrade?source_semester_id=${sourceSemesterId}&target_semester_id=${targetSemesterId}&upgrade_mode=${upgradeMode}`
      );
      if (!response.ok) {
        throw new Error("获取预览失败");
      }
      const data = await response.json();

      // 验证响应数据结构
      if (!data.data || !Array.isArray(data.data.available_grades)) {
        throw new Error("返回数据格式错误");
      }

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
        // 后端已处理年级名称递增，使用 original_name 和 name
        const originalName = g.original_name || g.name;
        const newName = g.name;

        return {
          old_grade: originalName,
          new_grade: newName,
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
          preserve_class_teachers: true,
          upgrade_mode: upgradeMode,
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

  // 切换到目标学期
  const handleSwitchToTargetSemester = async () => {
    if (!preview?.target_semester) return;

    try {
      const response = await fetch(`/api/semesters/${preview.target_semester.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_current" }),
      });

      if (response.ok) {
        // 切换成功，刷新页面
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "切换学期失败");
      }
    } catch (error) {
      console.error("切换学期失败:", error);
      alert("切换学期失败，请稍后重试");
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

  // 渲染选择模式步骤
  const renderSelectModeStep = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium">选择迁移模式</p>
        <p className="text-xs text-muted-foreground">根据不同的场景选择适合的迁移方式</p>
      </div>

      {/* 学期迁移选项 */}
      <button
        onClick={() => setUpgradeMode("semester")}
        type="button"
        className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
          upgradeMode === "semester"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            upgradeMode === "semester" ? "border-primary" : "border-muted"
          }`}>
            {upgradeMode === "semester" && (
              <div className="w-3 h-3 rounded-full bg-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">学期迁移（上下学期）</h3>
            <p className="text-sm text-muted-foreground mb-2">
              适用于同一年级的不同学期之间的数据迁移
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 年级名称保持不变（如"1年级"迁移后还是"1年级"）</li>
              <li>• 只迁移年级、班级、学生基础数据</li>
              <li>• 不迁移请假和缴费记录</li>
            </ul>
          </div>
        </div>
      </button>

      {/* 学年迁移选项 */}
      <button
        onClick={() => setUpgradeMode("year")}
        type="button"
        className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
          upgradeMode === "year"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            upgradeMode === "year" ? "border-primary" : "border-muted"
          }`}>
            {upgradeMode === "year" && (
              <div className="w-3 h-3 rounded-full bg-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">学年迁移</h3>
            <p className="text-sm text-muted-foreground mb-2">
              适用于跨学年的学生升级，自动处理毕业
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 年级名称自动递增（如"1年级" → "2年级"）</li>
              <li>• 六年级学生自动标记为毕业（is_active=false）</li>
              <li>• 只迁移年级、班级、学生基础数据</li>
              <li>• 不迁移请假和缴费记录</li>
            </ul>
          </div>
        </div>
      </button>
    </div>
  );

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
              // 根据迁移模式决定显示方式
              const isYearMode = upgradeMode === "year";
              const originalName = grade.original_name || grade.name;
              const newName = grade.name;

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
                      <Badge variant="outline">{originalName}</Badge>
                      {isYearMode && (
                        <>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge>{newName}</Badge>
                        </>
                      )}
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
            {upgradeMode === "year"
              ? "升级后年级名称自动递增（1→2，2→3），六年级学生将被标记为毕业。"
              : "迁移后年级名称保持不变。"
            }
            班主任为空需要手动分配。
          </p>
        </div>

        {/* 学年迁移时显示毕业提示 */}
        {upgradeMode === "year" && (preview?.graduating_students_count ?? 0) > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              <strong>毕业提示：</strong>
              将有 {preview.graduating_students_count} 名六年级学生被标记为毕业状态，不会被迁移到新学期。
            </p>
          </div>
        )}

        {/* 学号冲突警告 */}
        {(preview?.conflicting_students_count ?? 0) > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              <strong>学号冲突：</strong>
              检测到 {preview.conflicting_students_count} 名学生的学号在目标学期已存在，将被跳过。
            </p>
          </div>
        )}

        {/* 年级名称冲突警告（学年迁移） */}
        {upgradeMode === "year" && (preview?.conflicting_grades_count ?? 0) > 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              <strong>年级名称冲突提示：</strong>检测到 {preview.conflicting_grades_count} 个年级名称在目标学期已存在
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              学年迁移会自动递增年级名称，但目标学期已存在以下年级：
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside ml-4 space-y-1">
              {preview.conflicting_grades_names?.map((conflict, index) => (
                <li key={index}>{conflict}</li>
              ))}
            </ul>
            <div className="mt-3 space-y-2">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                请选择处理方式：
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    alert("请先删除目标学期中已存在的年级，或使用「学期迁移」模式。");
                  }}
                >
                  删除已存在的年级
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpgradeMode("semester");
                  }}
                >
                  切换到学期迁移
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染班主任预览步骤
  const renderTeacherPreviewStep = () => {
    if (!preview?.class_teacher_preview) {
      return (
        <div className="space-y-4 text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">正在加载班主任信息...</p>
        </div>
      );
    }

    const teacherPreview = preview.class_teacher_preview;
    const migrateCount = teacherPreview.filter((t) => t.will_migrate).length;

    return (
      <div className="space-y-4">
        {/* 提示信息 */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            将迁移 {migrateCount} 个班级的班主任到新学期
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            升级后，原班级的班主任关联将自动清除
          </p>
        </div>

        {/* 班主任映射列表 */}
        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="p-4 space-y-2">
            {teacherPreview.map((item) => (
              <div
                key={item.old_class_id}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.old_grade_name}</Badge>
                    <span className="font-medium">{item.old_class_name}</span>
                  </div>
                  {item.old_teacher_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      班主任: {item.old_teacher_name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {item.will_migrate ? (
                    <>
                      <ArrowRight className="h-4 w-4 text-green-500 inline" />
                      <p className="text-xs text-green-600 dark:text-green-400">自动迁移</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">无班主任</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 注意事项 */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            <strong>注意：</strong>
            班主任将自动迁移到新学期的对应班级，原班级的班主任关联将被清除。
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
                  {upgradeMode === "year" && (
                    <>
                      <th className="text-left p-2 font-medium"></th>
                      <th className="text-left p-2 font-medium">新年级</th>
                    </>
                  )}
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
                    {upgradeMode === "year" && (
                      <>
                        <td className="p-2 text-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                        </td>
                        <td className="p-2">
                          <Badge>{item.new_grade}</Badge>
                        </td>
                      </>
                    )}
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
  const renderResultStep = () => {
    // 计算跳过的学生数量
    const skippedCount = result?.skipped_count ?? result?.warnings?.length ?? 0;
    const hasWarnings = skippedCount > 0;
    const allSkipped = result?.students_created === 0 && hasWarnings;

    return (
      <div className="space-y-4 text-center py-4">
        <CheckCircle className={`h-16 w-16 mx-auto ${allSkipped ? "text-orange-500" : "text-green-500"}`} />
        <div>
          <p className="text-lg font-medium">
            {allSkipped ? "升级完成（有警告）" : "升级完成！"}
          </p>
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
          {skippedCount > 0 && (
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{skippedCount}</p>
              <p className="text-sm text-muted-foreground">跳过</p>
            </div>
          )}
        </div>

        {result?.graduated_students_count > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg text-left">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <GraduationCap className="h-4 w-4 inline mr-2" />
              <strong>毕业信息：</strong>
              有 {result.graduated_students_count} 名六年级学生被标记为毕业状态，不会迁移到新学期。
            </p>
          </div>
        )}

        {allSkipped ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-left">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              <strong>重要：没有学生被迁移！</strong>
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              所有学生都因为学号已存在而被跳过。这可能是因为：
            </p>
            <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside ml-4 space-y-1">
              <li>您之前已经执行过迁移到目标学期</li>
              <li>目标学期已经有了相同学号的学生数据</li>
            </ul>
            {result?.warnings && result.warnings.length > 0 && (
              <details className="mt-2">
                <summary className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer">
                  查看跳过的学生详情
                </summary>
                <div className="mt-2 text-left">
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 max-h-32 overflow-y-auto">
                    {result.warnings.slice(0, 50).map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                    {result.warnings.length > 50 && (
                      <li className="italic">... 还有 {result.warnings.length - 50} 条警告</li>
                    )}
                  </ul>
                </div>
              </details>
            )}
          </div>
        ) : hasWarnings ? (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg text-left">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              <strong>警告：</strong>有 {skippedCount} 名学生因学号已存在被跳过
            </p>
            <details className="mt-2">
              <summary className="text-sm font-medium text-yellow-800 dark:text-yellow-200 cursor-pointer">
                查看跳过的学生详情
              </summary>
              <div className="mt-2 text-left">
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 max-h-32 overflow-y-auto">
                  {result.warnings.slice(0, 50).map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                  {result.warnings.length > 50 && (
                    <li className="italic">... 还有 {result.warnings.length - 50} 条警告</li>
                  )}
                </ul>
              </div>
            </details>
          </div>
        ) : null}

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <GraduationCap className="h-4 w-4 inline mr-2" />
            提醒：请为各班级分配班主任
          </p>
        </div>

        {/* 切换学期提示 */}
        {preview?.target_semester && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  数据已迁移到「{preview.target_semester.name}」
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  切换当前学期到目标学期以查看迁移后的学生数据
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            学生升级到新学期
          </DialogTitle>
          <DialogDescription>
            {step === "select-mode" && "选择迁移模式"}
            {step === "select-semester" && "选择源学期和目标学期"}
            {step === "select-grade" && "选择要升级的年级"}
            {step === "teacher-preview" && "确认班主任迁移"}
            {step === "confirm" && "确认升级信息"}
            {step === "processing" && "正在执行升级操作"}
            {step === "result" && "升级已完成"}
          </DialogDescription>
        </DialogHeader>

        {step === "select-mode" && renderSelectModeStep()}
        {step === "select-semester" && renderSelectSemesterStep()}
        {step === "select-grade" && renderSelectGradeStep()}
        {step === "teacher-preview" && renderTeacherPreviewStep()}
        {step === "confirm" && renderConfirmStep()}
        {step === "processing" && renderProcessingStep()}
        {step === "result" && renderResultStep()}

        <DialogFooter>
          {step === "select-mode" && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                取消
              </Button>
              <Button onClick={() => setStep("select-semester")}>
                下一步：选择学期
              </Button>
            </>
          )}
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
                onClick={() => setStep("teacher-preview")}
                disabled={
                  Object.values(selectedGrades).filter((v) => v).length === 0 ||
                  loading
                }
              >
                下一步 ({Object.values(selectedGrades).filter((v) => v).length} 个年级)
              </Button>
            </>
          )}
          {step === "teacher-preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("select-grade")} disabled={loading}>
                上一步
              </Button>
              <Button onClick={() => setStep("confirm")}>
                确认升级
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
            <>
              <Button variant="outline" onClick={handleClose}>
                稍后切换
              </Button>
              {preview?.target_semester && (
                <Button onClick={handleSwitchToTargetSemester}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  切换到{preview.target_semester.name}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
