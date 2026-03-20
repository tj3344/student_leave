"use client";

import { GraduationCap, User, School, Calendar, Phone, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface GraduatedStudentTableProps {
  students: GraduatedStudent[];
  loading: boolean;
  sortField: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}

export function GraduatedStudentTable({
  students,
  loading,
  sortField,
  sortOrder,
  onSort,
}: GraduatedStudentTableProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const getGenderClass = (gender: string | null) => {
    if (gender === "男") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (gender === "女") return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">暂无毕业学生记录</p>
            <p className="text-sm text-muted-foreground mt-1">
              学年迁移后，六年级学生数据将显示在这里
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort("student_no")}
              >
                学号
                {sortField === "student_no" && (
                  <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort("name")}
              >
                姓名
                {sortField === "name" && (
                  <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead>性别</TableHead>
              <TableHead>班级</TableHead>
              <TableHead>年级</TableHead>
              <TableHead>学期</TableHead>
              <TableHead>班主任</TableHead>
              <TableHead>家长</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>营养餐</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort("graduation_date")}
              >
                毕业日期
                {sortField === "graduation_date" && (
                  <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.student_no}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    {student.name}
                  </div>
                </TableCell>
                <TableCell>
                  {student.gender && (
                    <Badge className={getGenderClass(student.gender)} variant="secondary">
                      {student.gender}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <School className="h-3 w-3 text-muted-foreground" />
                    {student.original_class_name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{student.original_grade_name}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {student.original_semester_name}
                </TableCell>
                <TableCell>
                  {student.original_class_teacher_name || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{student.parent_name || "-"}</TableCell>
                <TableCell>
                  {student.parent_phone ? (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {student.parent_phone}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {student.is_nutrition_meal ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      是
                    </Badge>
                  ) : (
                    <Badge variant="secondary">否</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(student.graduation_date)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
