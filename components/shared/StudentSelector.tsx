"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

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
      params.append("limit", "100");

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

  const selectedStudent = students.find((s) => s.id === value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select
          value={value ? String(value) : ""}
          onValueChange={(v) => onChange(parseInt(v, 10))}
          disabled={disabled || loading || !semesterId}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder}>
              {selectedStudent && (
                <span className="flex items-center gap-2">
                  <span>{selectedStudent.name}</span>
                  <span className="text-muted-foreground text-sm">
                    ({selectedStudent.student_no})
                  </span>
                  {selectedStudent.is_nutrition_meal === true && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      营养餐
                    </span>
                  )}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {!semesterId ? "请先选择学期" : "暂无学生数据"}
              </div>
            ) : (
              students.map((student) => (
                <SelectItem key={student.id} value={String(student.id)}>
                  <div className="flex items-center gap-2">
                    <span>{student.name}</span>
                    <span className="text-muted-foreground text-sm">
                      ({student.student_no})
                    </span>
                    {student.is_nutrition_meal === true && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        营养餐
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {student.grade_name} {student.class_name}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={fetchStudents}
          disabled={disabled || loading || !semesterId}
          title="刷新"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
      {selectedStudent && (
        <div className="text-sm text-muted-foreground">
          {selectedStudent.grade_name} {selectedStudent.class_name}
          {selectedStudent.is_nutrition_meal === true && (
            <span className="text-orange-600 ml-2">
              （营养餐学生，不退费）
            </span>
          )}
        </div>
      )}
    </div>
  );
}
