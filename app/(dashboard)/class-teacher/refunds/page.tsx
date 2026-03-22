"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import type { StudentRefundRecord, User } from "@/types";
import { Button } from "@/components/ui/button";
import { RefundRecordTable } from "@/components/admin/RefundRecordTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ClassTeacherRefundsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refundRecords, setRefundRecords] = useState<StudentRefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [classInfo, setClassInfo] = useState<{ id: number; name: string; grade_name: string } | null>(null);
  const [classInfoError, setClassInfoError] = useState<string | null>(null);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok) {
          const user = data.user as User;
          setCurrentUser(user);

          // 检查角色，必须是班主任
          if (user.role !== "class_teacher") {
            router.push("/leaves");
            return;
          }

          // 获取班主任管理的班级信息
          fetchClassInfo();
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Fetch user error:", error);
        router.push("/login");
      }
    };
    fetchCurrentUser();
  }, [router]);

  // 获取班主任管理的班级信息
  const fetchClassInfo = async () => {
    try {
      const response = await fetch("/api/class-teacher/class");
      const data = await response.json();
      if (response.ok && data.data) {
        setClassInfo(data.data);
        setClassInfoError(null);
      } else {
        setClassInfoError(data.error || "获取班级信息失败");
      }
    } catch (error) {
      console.error("Fetch class info error:", error);
      setClassInfoError("网络错误，请稍后重试");
    }
  };

  const fetchRefundRecords = async () => {
    if (!classInfo || !currentSemesterId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("semester_id", currentSemesterId);
      // 强制只获取本班学生的退费记录
      params.append("class_id", classInfo.id.toString());

      const response = await fetch(`/api/fees/refunds?${params.toString()}`);
      const data = await response.json();
      setRefundRecords(data.data || []);
    } catch (error) {
      console.error("Fetch refund records error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();

      // 只获取当前学期
      const currentSemester = data.data?.find((s: { is_current: boolean }) => s.is_current === true);
      if (currentSemester) {
        setCurrentSemesterId(currentSemester.id.toString());
      }
    } catch (error) {
      console.error("Fetch current semester error:", error);
    }
  };

  const handleExport = async () => {
    if (!classInfo || !currentSemesterId) return;

    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append("semester_id", currentSemesterId);
      params.append("class_id", classInfo.id.toString());

      const response = await fetch(`/api/fees/refunds/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "导出失败");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      link.download = `退费记录_${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (classInfo) {
      fetchCurrentSemester();
    }
  }, [classInfo]);

  useEffect(() => {
    if (classInfo && currentSemesterId) {
      fetchRefundRecords();
    }
  }, [classInfo, currentSemesterId]);

  if (!currentUser) {
    return <div>加载中...</div>;
  }

  if (classInfoError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>无法访问</AlertTitle>
        <AlertDescription>
          {classInfoError}
        </AlertDescription>
      </Alert>
    );
  }

  if (!classInfo) {
    return <div>加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">班级退费记录</h1>
          <p className="text-muted-foreground">
            查看 {classInfo.grade_name} {classInfo.name} 学生的退费金额（实时计算）
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting || refundRecords.length === 0}>
            {exporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            导出
          </Button>
          <Button variant="outline" size="icon" onClick={fetchRefundRecords} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <RefundRecordTable data={refundRecords} />
    </div>
  );
}
