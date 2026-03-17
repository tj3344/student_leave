"use client";

import { useState } from "react";
import { Search, User, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User, Class, Grade } from "@/types";

interface TeacherSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (teacherId: number | null) => void;
  teachers: User[];
  currentTeacherId?: number | null;
  classes?: Class[];
  grades?: Grade[];
}

export function TeacherSelectDialog({
  open,
  onClose,
  onSelect,
  teachers,
  currentTeacherId,
  classes = [],
  grades = [],
}: TeacherSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 获取教师担任班主任的班级列表
  const getTeacherClasses = (teacherId: number) => {
    return classes.filter((c) => c.class_teacher_id === teacherId);
  };

  // 格式化班级显示文本
  const formatClassNames = (teacherId: number) => {
    const teacherClasses = getTeacherClasses(teacherId);
    if (teacherClasses.length === 0) return null;

    const classNames = teacherClasses.map((c) => {
      const grade = grades.find((g) => g.id === c.grade_id);
      return grade ? `${grade.name}${c.name}` : c.name;
    }).join("、");
    return `(${classNames})`;
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.real_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (teacherId: number | null) => {
    onSelect(teacherId);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>选择班主任</DialogTitle>
          <DialogDescription>
            搜索并选择一个教师作为班主任
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索教师姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* 教师列表 */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              {/* 无班主任选项 */}
              <Button
                variant={currentTeacherId === null ? "secondary" : "ghost"}
                className="w-full justify-start px-3"
                onClick={() => handleSelect(null)}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left">无班主任</span>
                {currentTeacherId === null && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </Button>

              {/* 教师列表 */}
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher) => {
                  const classNames = formatClassNames(teacher.id);
                  return (
                    <Button
                      key={teacher.id}
                      variant={
                        currentTeacherId === teacher.id ? "secondary" : "ghost"
                      }
                      className="w-full justify-start px-3"
                      onClick={() => handleSelect(teacher.id)}
                    >
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col items-start">
                        <span>{teacher.real_name}</span>
                        {classNames && (
                          <span className="text-xs text-muted-foreground">
                            {classNames}
                          </span>
                        )}
                      </div>
                      {currentTeacherId === teacher.id && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </Button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? "未找到匹配的教师" : "暂无教师数据"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
