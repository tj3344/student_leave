"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, GraduationCap, Check } from "lucide-react";

interface StudentOption {
  id: number;
  student_no: string;
  name: string;
  class_name: string;
  grade_name: string;
  is_nutrition_meal: number;
}

interface StudentSelectorProps {
  value?: number;
  onChange: (studentId: number) => void;
  semesterId?: number;
  classId?: number;
  disabled?: boolean;
  placeholder?: string;
}

export function StudentSelector({
  value,
  onChange,
  semesterId,
  classId,
  disabled = false,
  placeholder = "请选择学生",
}: StudentSelectorProps) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 加载学生列表
  const fetchStudents = useCallback(async () => {
    if (!semesterId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("semester_id", String(semesterId));
      if (classId) {
        params.append("class_id", String(classId));
      }
      params.append("limit", "999"); // 获取更多学生

      const response = await fetch(`/api/students?${params.toString()}`);
      const data = await response.json();
      setStudents(data.data || []);
    } catch (error) {
      console.error("Fetch students error:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [semesterId, classId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // 过滤学生：支持按学号、姓名、班级搜索，并按学号升序排列
  const filteredStudents = students
    .filter((student) => {
      const query = searchQuery.toLowerCase();
      return (
        student.name.toLowerCase().includes(query) ||
        student.student_no.toLowerCase().includes(query) ||
        `${student.grade_name}${student.class_name}`.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.student_no.localeCompare(b.student_no, undefined, { numeric: true }));

  const handleSelect = (studentId: number) => {
    onChange(studentId);
    setSearchQuery("");
    setDialogOpen(false);
  };

  const selectedStudent = students.find((s) => s.id === value);

  return (
    <div className="space-y-2">
      {/* 触发按钮 */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start font-normal h-auto py-3"
        disabled={disabled || loading || !semesterId}
        onClick={() => setDialogOpen(true)}
      >
        <User className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex flex-col items-start flex-1">
          {selectedStudent ? (
            <>
              <span className="flex items-center gap-2">
                {selectedStudent.name}
                <span className="text-muted-foreground text-sm">
                  ({selectedStudent.student_no})
                </span>
                {selectedStudent.is_nutrition_meal === true && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                    营养餐
                  </span>
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {selectedStudent.grade_name} {selectedStudent.class_name}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
      </Button>

      {/* 选中学生的详细信息 */}
      {selectedStudent && !dialogOpen && (
        <div className="text-sm text-muted-foreground">
          {selectedStudent.grade_name} {selectedStudent.class_name}
          {selectedStudent.is_nutrition_meal === true && (
            <span className="text-orange-600 ml-2">
              （营养餐学生，不退费）
            </span>
          )}
        </div>
      )}

      {/* 学生选择对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>选择学生</DialogTitle>
            <DialogDescription>
              搜索并选择一个学生（支持按学号、姓名、班级搜索）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 搜索框 */}
            <div className="relative">
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索学号、姓名或班级..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {/* 学生列表 */}
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <Button
                      key={student.id}
                      variant={value === student.id ? "secondary" : "ghost"}
                      className="w-full justify-start px-3 h-auto py-3"
                      onClick={() => handleSelect(student.id)}
                    >
                      <div className="flex flex-col items-start flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{student.name}</span>
                          <span className="text-muted-foreground text-sm">
                            ({student.student_no})
                          </span>
                          {student.is_nutrition_meal === true && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                              营养餐
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-6 text-sm text-muted-foreground">
                          <GraduationCap className="h-3 w-3" />
                          <span>{student.grade_name} {student.class_name}</span>
                        </div>
                      </div>
                      {value === student.id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      )}
                    </Button>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "未找到匹配的学生" : "暂无学生数据"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
