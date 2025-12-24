"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Calendar, Phone, User, MapPin, School } from "lucide-react";
import type { StudentWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm } from "@/components/admin/StudentForm";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/students/${params.id}`);
      if (!response.ok) {
        throw new Error("获取学生信息失败");
      }
      const data = await response.json();
      setStudent(data);
    } catch (error) {
      console.error("Fetch student error:", error);
      alert("获取学生信息失败");
      router.push("/admin/students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchStudent();
    }
  }, [params.id]);

  const handleEdit = () => {
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchStudent();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">学生不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-muted-foreground">学号: {student.student_no}</p>
          </div>
        </div>
        <Button onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          编辑
        </Button>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">姓名</span>
              <span className="font-medium">{student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">性别</span>
              <span className="font-medium">{student.gender || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">学号</span>
              <span className="font-medium">{student.student_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">状态</span>
              <Badge variant={student.is_active ? "default" : "secondary"}>
                {student.is_active ? "在校" : "离校"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              班级信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">年级</span>
              <span className="font-medium">{student.grade_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">班级</span>
              <span className="font-medium">{student.class_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">营养餐</span>
              <Badge variant={student.is_nutrition_meal ? "default" : "secondary"}>
                {student.nutrition_meal_name}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              日期信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">出生日期</span>
              <span className="font-medium">
                {student.birth_date ? new Date(student.birth_date).toLocaleDateString("zh-CN") : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">入学日期</span>
              <span className="font-medium">
                {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString("zh-CN") : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              联系信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">家长姓名</span>
              <span className="font-medium">{student.parent_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">家长手机</span>
              <span className="font-medium">{student.parent_phone || "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              家庭住址
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{student.address || "未填写"}</p>
          </CardContent>
        </Card>
      </div>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle>系统信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">创建时间</span>
            <span className="font-medium">
              {new Date(student.created_at).toLocaleString("zh-CN")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">更新时间</span>
            <span className="font-medium">
              {new Date(student.updated_at).toLocaleString("zh-CN")}
            </span>
          </div>
        </CardContent>
      </Card>

      <StudentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        student={student}
      />
    </div>
  );
}
