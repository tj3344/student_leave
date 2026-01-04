import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import {
  batchCreateOrUpdateClasses,
  getSemesterAndGradeIds,
  getClassTeacherId,
} from "@/lib/api/classes";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { checkImportRateLimit, getClientIp } from "@/lib/utils/rate-limit";
import type { ClassImportRow, ClassInput } from "@/types";

/**
 * POST /api/classes/import - 批量导入班级
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.CLASS_IMPORT)) {
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
    const { classes } = body as { classes: ClassImportRow[] };

    if (!Array.isArray(classes) || classes.length === 0) {
      return NextResponse.json({ error: "班级数据不能为空" }, { status: 400 });
    }

    // 检测 Excel 内部的重复数据（学期+年级+班级组合）
    const classKeyMap = new Map<string, number>();
    const duplicateErrors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < classes.length; i++) {
      const row = classes[i];
      const rowNum = i + 1;
      const semesterName = row.semester_name?.trim();
      const gradeName = row.grade_name?.trim();
      const className = row.name?.trim();

      if (semesterName && gradeName && className) {
        // 创建唯一键：学期+年级+班级
        const uniqueKey = `${semesterName}_${gradeName}_${className}`;

        if (classKeyMap.has(uniqueKey)) {
          const firstRow = classKeyMap.get(uniqueKey);
          duplicateErrors.push({
            row: rowNum,
            message: `班级 "${semesterName}-${gradeName}-${className}" 与第 ${firstRow} 行重复`
          });
        } else {
          classKeyMap.set(uniqueKey, rowNum);
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
    const validatedClasses: ClassInput[] = [];
    const validationErrors: Array<{
      row: number;
      message: string;
    }> = [];

    for (let i = 0; i < classes.length; i++) {
      const row = classes[i];
      const rowNum = i + 1;

      // 验证必填字段
      if (!row.semester_name?.trim()) {
        validationErrors.push({ row: rowNum, message: "学期名称不能为空" });
        continue;
      }
      if (!row.grade_name?.trim()) {
        validationErrors.push({ row: rowNum, message: "年级名称不能为空" });
        continue;
      }
      if (!row.name?.trim()) {
        validationErrors.push({ row: rowNum, message: "班级名称不能为空" });
        continue;
      }

      // 验证班级名称长度
      if (row.name.trim().length > 20) {
        validationErrors.push({ row: rowNum, message: "班级名称不能超过20个字符" });
        continue;
      }

      // 获取学期和年级 ID
      const idsResult = getSemesterAndGradeIds(row.semester_name.trim(), row.grade_name.trim());
      if (idsResult.error) {
        validationErrors.push({ row: rowNum, message: idsResult.error });
        continue;
      }

      // 获取班主任 ID（如果提供了班主任姓名）
      let classTeacherId: number | undefined = undefined;
      if (row.class_teacher_name?.trim()) {
        const teacherResult = getClassTeacherId(row.class_teacher_name.trim());
        if (teacherResult.error) {
          validationErrors.push({ row: rowNum, message: teacherResult.error });
          continue;
        }
        classTeacherId = teacherResult.teacher_id;
      }

      // 构建验证后的数据
      validatedClasses.push({
        semester_id: idsResult.semester_id ?? 0,
        grade_id: idsResult.grade_id ?? 0,
        name: row.name.trim(),
        class_teacher_id: classTeacherId,
      });
    }

    // 如果有验证错误，返回错误信息
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "数据验证失败",
          validationErrors,
        },
        { status: 400 }
      );
    }

    // 执行批量导入
    const result = batchCreateOrUpdateClasses(validatedClasses);

    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("批量导入班级失败:", error);
    return NextResponse.json({ error: "批量导入班级失败" }, { status: 500 });
  }
}
