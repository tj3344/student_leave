"use client";

import { useState, useCallback } from "react";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseLeaveExcel, downloadLeaveTemplate } from "@/lib/utils/excel";
import { formatDate } from "@/lib/utils/date";
import type { LeaveImportRow, LeaveImportResult } from "@/types";

interface LeaveImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSemesterId?: number | null;
  currentSemesterName?: string | null;
}

type ImportStep = "upload" | "preview" | "processing" | "result";

export function LeaveImportDialog({
  open,
  onClose,
  onSuccess,
  currentSemesterId,
  currentSemesterName
}: LeaveImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<LeaveImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<LeaveImportResult[]>([]);
  const [importResult, setImportResult] = useState<{
    created: number;
    failed: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 文件大小限制（10MB） */
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  // 重置状态
  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setData([]);
    setValidationResults([]);
    setImportResult(null);
    setLoading(false);
    setDragActive(false);
    setError(null);
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      if (!selectedFile) return;

      // 清除之前的错误
      setError(null);

      // 检查文件大小
      if (selectedFile.size > MAX_FILE_SIZE) {
        const fileSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
        const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
        setError(`文件大小（${fileSizeMB}MB）超过限制（${maxSizeMB}MB）`);
        return;
      }

      // 验证文件类型
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
      if (!validTypes.includes(selectedFile.type) && !["xlsx", "xls"].includes(fileExtension || "")) {
        setError("请选择 Excel 文件（.xlsx 或 .xls）");
        return;
      }

      setLoading(true);
      setFile(selectedFile);

      try {
        // 解析 Excel 文件
        const parsedData = await parseLeaveExcel(selectedFile);

        if (parsedData.length === 0) {
          setError("文件中没有找到有效数据");
          setLoading(false);
          return;
        }

        setData(parsedData);

        // 验证数据
        const validation = await validateData(parsedData);
        setValidationResults(validation);
        setStep("preview");
      } catch (error) {
        console.error("解析文件失败:", error);
        const errorMessage = error instanceof Error ? error.message : "解析文件失败，请检查文件格式是否正确";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 验证数据
  const validateData = async (rows: LeaveImportRow[]): Promise<LeaveImportResult[]> => {
    try {
      const response = await fetch("/api/leaves/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSemesterId,
          currentSemesterName,
          validateOnly: true,
          leaves: rows.map((row) => ({
            ...row,
            // 确保所有字段都有值
            student_no: row.student_no || "",
            student_name: row.student_name || "",
            semester_name: row.semester_name || "",
            grade_name: row.grade_name || "",
            class_name: row.class_name || "",
            start_date: row.start_date || "",
            end_date: row.end_date || "",
            leave_days: row.leave_days || "",
            reason: row.reason || "",
          })),
        }),
      });

      // 检查响应类型，处理HTML错误页面
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/html')) {
        const errorMessage = `服务器返回错误 (${response.status})，请检查API路由或联系管理员`;
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        const errorData = await response.json();

        // 处理速率限制错误
        if (response.status === 429) {
          const rateLimitMessage = errorData.error || "请求过于频繁，请稍后重试";
          setError(rateLimitMessage);
          throw new Error(rateLimitMessage);
        }

        // 如果是验证错误，使用 Map 优化错误查找
        if (errorData.validationErrors) {
          const errorMap = new Map(errorData.validationErrors.map((e: { row: number; message: string }) => [e.row, e.message]));
          return rows.map((row, index) => {
            const rowNum = index + 1;
            const errorMessage = errorMap.get(rowNum);
            return {
              row: rowNum,
              success: !errorMessage,
              message: errorMessage || "验证通过",
            };
          });
        }

        // 其他错误
        const errorMessage = errorData.error || "验证失败";
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // 返回成功结果
      return rows.map((row, index) => ({
        row: index + 1,
        success: true,
        message: "验证通过",
      }));
    } catch (err) {
      // 确保错误被设置
      const errorMessage = err instanceof Error ? err.message : "验证失败，请稍后重试";
      if (!error) {
        setError(errorMessage);
      }
      return rows.map((row, index) => ({
        row: index + 1,
        success: false,
        message: errorMessage,
      }));
    }
  };

  // 执行导入
  const handleImport = async () => {
    // 过滤出验证通过的数据
    const validData = data.filter((_, index) =>
      validationResults[index]?.success
    );

    if (validData.length === 0) {
      alert("没有可导入的数据");
      return;
    }

    setStep("processing");
    setLoading(true);

    try {
      const response = await fetch("/api/leaves/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSemesterId,
          currentSemesterName,
          leaves: validData
        }),
      });

      if (!response.ok) {
        throw new Error("导入失败");
      }

      const result = await response.json();
      setImportResult({
        created: result.created,
        failed: result.failed,
        errors: result.errors,
      });
      setStep("result");
    } catch (error) {
      console.error("导入失败:", error);
      alert("导入失败，请稍后重试");
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  // 拖拽事件处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  // 关闭对话框
  const handleClose = () => {
    if (step === "result") {
      onSuccess();
    }
    resetState();
    onClose();
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    downloadLeaveTemplate();
  };

  // 渲染上传步骤
  const renderUploadStep = () => (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          拖拽 Excel 文件到这里，或点击选择文件
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          文件大小限制：{(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          className="hidden"
          id="file-upload"
          disabled={loading}
        />
        <label htmlFor="file-upload">
          <Button variant="outline" className="cursor-pointer" asChild disabled={loading}>
            <span>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  选择文件
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">或</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleDownloadTemplate}
      >
        <Download className="mr-2 h-4 w-4" />
        下载导入模板
      </Button>
    </div>
  );

  // 渲染预览步骤
  const renderPreviewStep = () => {
    const validCount = validationResults.filter((r) => r.success).length;
    const errorCount = validationResults.filter((r) => !r.success).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium">数据验证结果</p>
            <p className="text-xs text-muted-foreground">
              共 {data.length} 条数据，{validCount} 条通过，{errorCount} 条错误
            </p>
          </div>
          {errorCount === 0 ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          )}
        </div>

        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="p-4">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2 font-medium">行号</th>
                  <th className="text-left p-2 font-medium">学号</th>
                  <th className="text-left p-2 font-medium">姓名</th>
                  <th className="text-left p-2 font-medium">学期</th>
                  <th className="text-left p-2 font-medium">年级</th>
                  <th className="text-left p-2 font-medium">班级</th>
                  <th className="text-left p-2 font-medium">开始日期</th>
                  <th className="text-left p-2 font-medium">结束日期</th>
                  <th className="text-left p-2 font-medium">天数</th>
                  <th className="text-left p-2 font-medium">事由</th>
                  <th className="text-left p-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => {
                  const result = validationResults[index];
                  return (
                    <tr
                      key={index}
                      className={`border-b ${
                        result?.success ? "" : "bg-red-50/50"
                      }`}
                    >
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{row.student_no}</td>
                      <td className="p-2">{row.student_name}</td>
                      <td className="p-2">{row.semester_name}</td>
                      <td className="p-2">{row.grade_name}</td>
                      <td className="p-2">{row.class_name}</td>
                      <td className="p-2">{formatDate(row.start_date)}</td>
                      <td className="p-2">{formatDate(row.end_date)}</td>
                      <td className="p-2">{row.leave_days}</td>
                      <td className="p-2">{row.reason}</td>
                      <td className="p-2">
                        {result?.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 inline" />
                        )}
                        {result?.message && (
                          <span className="text-xs text-red-500 ml-2">
                            {result.message}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>
    );
  };

  // 渲染处理中步骤
  const renderProcessingStep = () => (
    <div className="space-y-4 text-center py-8">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
      <p className="text-lg font-medium">正在导入数据...</p>
      <p className="text-sm text-muted-foreground">请稍候，这可能需要一些时间</p>
      <Progress value={66} className="mx-auto max-w-xs" />
    </div>
  );

  // 渲染结果步骤
  const renderResultStep = () => {
    const hasErrors = importResult?.failed && importResult.failed > 0;
    const hasDetailedErrors = hasErrors && importResult.errors && importResult.errors.length > 0;

    return (
    <div className="space-y-4 text-center py-8">
      <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
      <div>
        <p className="text-lg font-medium">导入完成！</p>
        <p className="text-sm text-muted-foreground mt-2">
          共处理 {data.length} 条数据
        </p>
      </div>

      <div className="flex justify-center gap-8 py-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{importResult?.created || 0}</p>
          <p className="text-sm text-muted-foreground">新增</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-600">{importResult?.failed || 0}</p>
          <p className="text-sm text-muted-foreground">失败</p>
        </div>
      </div>

      {hasErrors && (
        <div className="mt-6">
          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium mb-2">
              失败详情：{!hasDetailedErrors && (
                <span className="text-muted-foreground text-xs ml-2">（无详细错误信息，请检查控制台日志）</span>
              )}
            </p>
            <ScrollArea className="h-[200px] border rounded-md">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-2 font-medium">行号</th>
                    <th className="text-left p-2 font-medium">学号</th>
                    <th className="text-left p-2 font-medium">姓名</th>
                    <th className="text-left p-2 font-medium">错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => {
                    const validationResult = validationResults[index];
                    // 显示验证错误或导入错误
                    if (!validationResult?.success) {
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">{row.student_no || '-'}</td>
                          <td className="p-2">{row.student_name || '-'}</td>
                          <td className="p-2 text-red-600">
                            {validationResult.message || "未知错误"}
                          </td>
                        </tr>
                      );
                    }
                    // 显示导入失败（有错误信息）
                    if (importResult?.errors?.length > 0) {
                      const importError = importResult.errors.find(e => e.row === index + 1);
                      if (importError) {
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">{importError.student_no || row.student_no || '-'}</td>
                            <td className="p-2">{importError.student_name || row.student_name || '-'}</td>
                            <td className="p-2 text-red-600">
                              {importError.message || "未知错误"}
                            </td>
                          </tr>
                        );
                      }
                    }
                    return null;
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>导入请假记录</DialogTitle>
          <DialogDescription>
            {step === "upload" && "上传 Excel 文件或下载模板开始导入"}
            {step === "preview" && "确认数据无误后点击导入"}
            {step === "processing" && "正在处理导入请求"}
            {step === "result" && "导入已完成"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && renderUploadStep()}
        {step === "preview" && renderPreviewStep()}
        {step === "processing" && renderProcessingStep()}
        {step === "result" && renderResultStep()}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                上一步
              </Button>
              <Button
                onClick={handleImport}
                disabled={validationResults.filter((r) => r.success).length === 0}
              >
                确认导入 ({validationResults.filter((r) => r.success).length} 条)
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
