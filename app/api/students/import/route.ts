import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import {
  batchCreateOrUpdateStudents,
  getClassIdByNames,
} from "@/lib/api/students";
import { hasPermission, PERMISSIONS, GENDERS } from "@/lib/constants";
import { logImport } from "@/lib/utils/logger";
import { checkImportRateLimit, getClientIp } from "@/lib/utils/rate-limit";
import type { StudentImportRow, StudentInput } from "@/types";

/**
 * POST /api/students/import - 批量导入学生
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.STUDENT_IMPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 检查速率限制
    const clientIp = getClientIp(request);
    const rateLimitCheck = checkImportRateLimit(currentUser.id, clientIp);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error || "请求过于频繁，请稍后重试" },
        { status: 429 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { students } = body as { students: StudentImportRow[] };

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "学生数据不能为空" }, { status: 400 });
    }

    // 检测 Excel 内部的重复数据（按学号）
    const studentNoMap = new Map<string, number>();
    const duplicateErrors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      const rowNum = i + 1;
      const studentNo = row.student_no?.trim();

      if (studentNo) {
        if (studentNoMap.has(studentNo)) {
          const firstRow = studentNoMap.get(studentNo);
          duplicateErrors.push({
            row: rowNum,
            message: `学号 "${studentNo}" 与第 ${firstRow} 行重复，请确保学号唯一`
          });
        } else {
          studentNoMap.set(studentNo, rowNum);
        }
      }
    }

    // 如果有重复数据，返回错误
    if (duplicateErrors.length > 0) {
      return NextResponse.json(
        {
          error: "检测到重复数据",
          validationErrors: duplicateErrors,
        },
        { status: 400 }
      );
    }

    // 转换和验证数据
    const validatedStudents: StudentInput[] = [];
    const validationErrors: Array<{
      row: number;
      message: string;
    }> = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      const rowNum = i + 1;

      // 验证必填字段
      if (!row.student_no?.trim()) {
        validationErrors.push({ row: rowNum, message: "学号不能为空" });
        continue;
      }
      if (!row.name?.trim()) {
        validationErrors.push({ row: rowNum, message: "学生姓名不能为空" });
        continue;
      }
      if (!row.semester_name?.trim()) {
        validationErrors.push({ row: rowNum, message: "学期名称不能为空" });
        continue;
      }
      if (!row.grade_name?.trim()) {
        validationErrors.push({ row: rowNum, message: "年级名称不能为空" });
        continue;
      }
      if (!row.class_name?.trim()) {
        validationErrors.push({ row: rowNum, message: "班级名称不能为空" });
        continue;
      }

      // 验证学号长度
      if (row.student_no.trim().length > 50) {
        validationErrors.push({ row: rowNum, message: "学号不能超过50个字符" });
        continue;
      }

      // 验证性别
      if (row.gender && row.gender !== GENDERS.MALE && row.gender !== GENDERS.FEMALE) {
        validationErrors.push({ row: rowNum, message: "性别只能是男或女" });
        continue;
      }

      // 获取班级 ID
      const classIdResult = await getClassIdByNames(
        row.semester_name.trim(),
        row.grade_name.trim(),
        row.class_name.trim()
      );
      if (classIdResult.error) {
        validationErrors.push({ row: rowNum, message: classIdResult.error });
        continue;
      }

      // 转换是否营养餐
      let isNutritionMeal: boolean | undefined = undefined;
      const rawMealValue = row.is_nutrition_meal?.trim();
      if (rawMealValue) {
        const value = rawMealValue;
        if (value === "是" || value === "1" || value.toLowerCase() === "yes") {
          isNutritionMeal = true;
        } else if (value === "否" || value === "0" || value.toLowerCase() === "no") {
          isNutritionMeal = false;
        } else {
          console.log(`[学生导入] 第${rowNum}行: 未识别的营养餐值: "${value}"`);
        }
      }
      console.log(`[学生导入] 第${rowNum}行: 原始值="${row.is_nutrition_meal}", 处理后值=${isNutritionMeal}`);

      // 验证 class_id 有效性
      if (!classIdResult.class_id || classIdResult.class_id <= 0) {
        validationErrors.push({
          row: rowNum,
          message: `班级 ID 无效（学期：${row.semester_name}，年级：${row.grade_name}，班级：${row.class_name}）`
        });
        continue;
      }

      // 构建验证后的数据
      validatedStudents.push({
        student_no: row.student_no.trim(),
        name: row.name.trim(),
        gender: row.gender?.trim(),
        class_id: classIdResult.class_id,
        parent_name: row.parent_name?.trim() || undefined,
        parent_phone: row.parent_phone?.trim() || undefined,
        address: row.address?.trim() || undefined,
        is_nutrition_meal: isNutritionMeal,
        enrollment_date: row.enrollment_date?.trim() || undefined,
      });
    }

    // 如果有验证错误，返回错误信息
    if (validationErrors.length > 0) {
      console.log("[学生导入验证失败] validationErrors:", JSON.stringify(validationErrors, null, 2));
      return NextResponse.json(
        {
          error: "数据验证失败",
          validationErrors,
        },
        { status: 400 }
      );
    }

    // 执行批量导入
    const result = await batchCreateOrUpdateStudents(validatedStudents);

    // 记录导入日志
    await logImport(currentUser.id, "students", `导入学生数据：新增 ${result.created} 条，更新 ${result.updated} 条，失败 ${result.failed} 条`);

    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("批量导入学生失败:", error);
    return NextResponse.json({ error: "批量导入学生失败" }, { status: 500 });
  }
}
