"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, CheckCircle, AlertCircle, GraduationCap, ChevronDown, X } from "lucide-react";
import dynamic from "next/dynamic";
import type { LeaveWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClassSelectDialog } from "@/components/admin/ClassSelectDialog";

// 代码分割：动态导入大型组件
const LeaveTable = dynamic(
  () => import("@/components/admin/LeaveTable").then(m => ({ default: m.LeaveTable })),
  { ssr: false }
);
const LeaveReviewDialog = dynamic(
  () => import("@/components/admin/LeaveReviewDialog").then(m => ({ default: m.LeaveReviewDialog })),
  { ssr: false }
);
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ClassOption {
  id: number;
  name: string;
  grade_name: string;
}

export default function PendingLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [classList, setClassList] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [classDialogOpen, setClassDialogOpen] = useState(false);

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<LeaveWithDetails | null>(null);
  const [reviewMode, setReviewMode] = useState<"view" | "approve" | "reject">("view");

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("status", "pending");
      if (searchQuery) params.append("search", searchQuery);
      if (currentSemesterId) params.append("semester_id", currentSemesterId.toString());
      if (classFilter) params.append("class_id", classFilter);

      const response = await fetch(`/api/leaves?${params.toString()}`);
      const data = await response.json();
      setLeaves(data.data || []);
      setPendingCount(data.total || 0);
    } catch (error) {
      console.error("Fetch leaves error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSemester = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      const currentSemester = data.data?.find((s: { is_current: boolean }) => s.is_current === true);
      if (currentSemester) {
        setCurrentSemesterId(currentSemester.id);
      }
    } catch (error) {
      console.error("获取当前学期失败:", error);
    } finally {
      setSemesterLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams();
      if (currentSemesterId) {
        params.append("semester_id", currentSemesterId.toString());
      }
      const response = await fetch(`/api/classes?${params.toString()}`);
      const data = await response.json();
      setClassList(data.data || []);
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  const handleClearClassFilter = () => {
    setClassFilter("");
  };

  const selectedClass = classList.find((c) => c.id === parseInt(classFilter, 10));

  useEffect(() => {
    fetchCurrentSemester();
  }, []);

  useEffect(() => {
    if (currentSemesterId) {
      fetchLeaves();
      fetchClasses();
    }
  }, [searchQuery, currentSemesterId, classFilter]);

  const handleViewDetail = (leave: LeaveWithDetails) => {
    setReviewLeave(leave);
    setReviewMode("view");
    setReviewDialogOpen(true);
  };

  const handleApprove = (leave: LeaveWithDetails) => {
    setReviewLeave(leave);
    setReviewMode("approve");
    setReviewDialogOpen(true);
  };

  const handleReject = (leave: LeaveWithDetails) => {
    setReviewLeave(leave);
    setReviewMode("reject");
    setReviewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            待审核请假
          </h1>
          <p className="text-muted-foreground">审核待处理的请假申请</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => currentSemesterId && fetchLeaves()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 无当前学期提示 */}
      {!currentSemesterId && !semesterLoading ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>未设置当前学期</AlertTitle>
          <AlertDescription>
            请先在学期管理中设置一个当前学期。
            <Button variant="outline" size="sm" className="ml-4" onClick={() => window.location.href = "/admin/semesters"}>
              前往学期管理
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* 统计卡片 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待审核申请</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
                </div>
                <AlertCircle className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          {/* 筛选栏 */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名、学号、申请人..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* 班级筛选 */}
            <div className="flex items-center gap-1">
              {!classFilter ? (
                <Button
                  variant="outline"
                  className="min-w-[180px] justify-start font-normal text-muted-foreground"
                  onClick={() => setClassDialogOpen(true)}
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  全部班级
                  <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    className="min-w-[180px] justify-start font-normal"
                    onClick={() => setClassDialogOpen(true)}
                  >
                    <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                    {selectedClass ? `${selectedClass.grade_name} - ${selectedClass.name}` : `班级 ID: ${classFilter}`}
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleClearClassFilter}
                    title="清除筛选"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <ClassSelectDialog
            open={classDialogOpen}
            onClose={() => setClassDialogOpen(false)}
            onSelect={(classId) => setClassFilter(classId.toString())}
            classes={classList}
            currentClassId={!classFilter ? null : parseInt(classFilter, 10)}
          />

          {leaves.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <p className="text-lg">暂无待审核的请假申请</p>
              </CardContent>
            </Card>
          ) : (
            <LeaveTable
              data={leaves}
              showReviewActions={true}
              onViewDetail={handleViewDetail}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </>
      )}

      {/* 审核对话框 */}
      <LeaveReviewDialog
        open={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          setReviewLeave(null);
        }}
        onSuccess={fetchLeaves}
        leave={reviewLeave}
        mode={reviewMode}
      />
    </div>
  );
}
