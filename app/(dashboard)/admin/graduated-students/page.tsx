"use client";

import { useState, useEffect } from "react";
import { Search, Download, Calendar, User, School } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduatedStudentTable } from "@/components/admin/GraduatedStudentTable";

interface GraduatedStudent {
  id: number;
  student_no: string;
  name: string;
  gender: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  address: string | null;
  is_nutrition_meal: boolean;
  enrollment_date: string | null;
  graduation_date: string;
  original_class_name: string;
  original_grade_name: string;
  original_semester_name: string;
  original_class_teacher_name: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function GraduatedStudentsPage() {
  const [students, setStudents] = useState<GraduatedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [semesterList, setSemesterList] = useState<Array<{ id: number; name: string }>>([]);
  const [gradeList, setGradeList] = useState<Array<{ name: string }>>([]);
  const [classList, setClassList] = useState<Array<{ name: string; grade_name: string }>>([]);

  // 分页状态
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 排序状态（默认按学号升序排列）
  const [sortField, setSortField] = useState("student_no");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 获取学期列表
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const response = await fetch("/api/semesters");
        if (response.ok) {
          const data = await response.json();
          setSemesterList(data.data || []);
        }
      } catch (error) {
        console.error("获取学期列表失败:", error);
      }
    };
    fetchSemesters();
  }, []);

  // 获取年级列表（从已毕业学生中提取）
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await fetch("/api/graduated-students/grades");
        if (response.ok) {
          const data = await response.json();
          setGradeList(data.data || []);
        }
      } catch (error) {
        console.error("获取年级列表失败:", error);
      }
    };
    fetchGrades();
  }, []);

  // 获取班级列表（从已毕业学生中提取）
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/graduated-students/classes");
        if (response.ok) {
          const data = await response.json();
          setClassList(data.data || []);
        }
      } catch (error) {
        console.error("获取班级列表失败:", error);
      }
    };
    fetchClasses();
  }, []);

  // 获取毕业学生数据
  useEffect(() => {
    fetchStudents();
  }, [pagination.page, sortField, sortOrder]);

  const fetchStudents = async (page = pagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (semesterFilter) params.append("semester", semesterFilter);
      if (gradeFilter) params.append("grade", gradeFilter);
      if (classFilter) params.append("class", classFilter);
      params.append("page", page.toString());
      params.append("limit", pagination.limit.toString());
      params.append("sort", sortField);
      params.append("order", sortOrder);

      const response = await fetch(`/api/graduated-students?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error("获取毕业学生失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 导出数据
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (semesterFilter) params.append("semester", semesterFilter);
      if (gradeFilter) params.append("grade", gradeFilter);
      if (classFilter) params.append("class", classFilter);

      const response = await fetch(`/api/graduated-students/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `毕业学生_${new Date().toLocaleDateString()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("导出失败:", error);
    }
  };

  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchStudents(1);
  };

  // 处理排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">毕业学生管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看和管理已毕业学生的历史记录
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总毕业生数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <School className="h-4 w-4" />
              涉及学期
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{semesterList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              当前筛选
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              第 {pagination.page} / {pagination.totalPages} 页
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索学号或姓名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择学期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部学期</SelectItem>
                {semesterList.map((semester) => (
                  <SelectItem key={semester.id} value={semester.name}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={gradeFilter} onValueChange={(value) => {
              setGradeFilter(value);
              setClassFilter(""); // 重置班级筛选
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="选择年级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年级</SelectItem>
                {gradeList.map((grade) => (
                  <SelectItem key={grade.name} value={grade.name}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={classFilter}
              onValueChange={setClassFilter}
              disabled={!gradeFilter || gradeFilter === "all"}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={gradeFilter && gradeFilter !== "all" ? "选择班级" : "请先选年级"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部班级</SelectItem>
                {classList
                  .filter((c) => !gradeFilter || gradeFilter === "all" || c.grade_name === gradeFilter)
                  .map((cls) => (
                    <SelectItem key={cls.name} value={cls.name}>
                      {cls.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>

            {(searchQuery || semesterFilter || gradeFilter || classFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSemesterFilter("");
                  setGradeFilter("");
                  setClassFilter("");
                  setPagination({ ...pagination, page: 1 });
                  fetchStudents(1);
                }}
              >
                清除筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 学生表格 */}
      <GraduatedStudentTable
        students={students}
        loading={loading}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => {
                const newPage = pagination.page - 1;
                setPagination({ ...pagination, page: newPage });
                fetchStudents(newPage);
              }}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => {
                const newPage = pagination.page + 1;
                setPagination({ ...pagination, page: newPage });
                fetchStudents(newPage);
              }}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
