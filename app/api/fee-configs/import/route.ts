import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import {
  batchCreateOrUpdateFeeConfigs,
  getClassIdByNames,
} from "@/lib/api/fees";
import { getSemesterById } from "@/lib/api/semesters";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { checkImportRateLimit, getClientIp } from "@/lib/utils/rate-limit";
import type { FeeConfigImportRow, FeeConfigInput } from "@/types";

/**
 * POST /api/fee-configs/import - 批量导入费用配置
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.FEE_IMPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const { currentSemesterId, feeConfigs, validateOnly } = body as {
      currentSemesterId?: number;
      feeConfigs: FeeConfigImportRow[];
      validateOnly?: boolean;
    };

    // 如果不是仅验证模式，检查速率限制
    if (!validateOnly) {
      const clientIp = getClientIp(request);
      const rateLimitCheck = checkImportRateLimit(currentUser.id, clientIp);
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          { error: rateLimitCheck.error || "请求过于频繁，请稍后重试" },
          { status: 429 }
        );
      }
    }

    if (!Array.isArray(feeConfigs) || feeConfigs.length === 0) {
      return NextResponse.json({ error: "费用配置数据不能为空" }, { status: 400 });
    }

    // 验证当前学期
    let currentSemesterName: string | null = null;
    if (currentSemesterId) {
      const currentSemester = await getSemesterById(currentSemesterId);
      if (currentSemester) {
        currentSemesterName = currentSemester.name;
      }
    }

    // 检测 Excel 内部的重复数据（学期+年级+班级组合）
    const classKeyMap = new Map<string, number>();
    const duplicateErrors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < feeConfigs.length; i++) {
      const row = feeConfigs[i];
      const rowNum = i + 1;
      const semesterName = row.semester_name?.trim();
      const gradeName = row.grade_name?.trim();
      const className = row.class_name?.trim();

      if (semesterName && gradeName && className) {
        // 创建唯一键：学期+年级+班级
        const uniqueKey = `${semesterName}_${gradeName}_${className}`;

        if (classKeyMap.has(uniqueKey)) {
          const firstRow = classKeyMap.get(uniqueKey);
          duplicateErrors.push({
            row: rowNum,
            message: `费用配置 "${semesterName}-${gradeName}-${className}" 与第 ${firstRow} 行重复`
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
    const validatedFeeConfigs: FeeConfigInput[] = [];
    const validationErrors: Array<{
      row: number;
      message: string;
    }> = [];

    for (let i = 0; i < feeConfigs.length; i++) {
      const row = feeConfigs[i];
      const rowNum = i + 1;

      // 验证必填字段
      if (!row.semester_name?.trim()) {
        validationErrors.push({ row: rowNum, message: "学期名称不能为空" });
        continue;
      }

      // 验证学期名称与当前学期匹配
      if (currentSemesterName && row.semester_name.trim() !== currentSemesterName) {
        validationErrors.push({
          row: rowNum,
          message: `学期名称必须与当前学期一致（当前学期：${currentSemesterName}）`
        });
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
      if (!row.meal_fee_standard?.trim()) {
        validationErrors.push({ row: rowNum, message: "餐费标准不能为空" });
        continue;
      }
      if (!row.prepaid_days?.trim()) {
        validationErrors.push({ row: rowNum, message: "预收天数不能为空" });
        continue;
      }
      if (!row.actual_days?.trim()) {
        validationErrors.push({ row: rowNum, message: "实收天数不能为空" });
        continue;
      }
      if (!row.suspension_days?.trim()) {
        validationErrors.push({ row: rowNum, message: "停课天数不能为空" });
        continue;
      }

      // 获取班级和学期 ID
      const classIdResult = await getClassIdByNames(
        row.semester_name.trim(),
        row.grade_name.trim(),
        row.class_name.trim()
      );
      if (classIdResult.error) {
        validationErrors.push({ row: rowNum, message: classIdResult.error });
        continue;
      }

      // 验证并转换数值
      const mealFeeStandard = parseFloat(row.meal_fee_standard.trim());
      if (isNaN(mealFeeStandard) || mealFeeStandard <= 0) {
        validationErrors.push({ row: rowNum, message: "餐费标准必须是大于0的数字" });
        continue;
      }
      if (mealFeeStandard > 9999.99) {
        validationErrors.push({ row: rowNum, message: "餐费标准不能超过9999.99" });
        continue;
      }

      const prepaidDays = parseInt(row.prepaid_days.trim(), 10);
      if (isNaN(prepaidDays) || prepaidDays < 0) {
        validationErrors.push({ row: rowNum, message: "预收天数必须是非负整数" });
        continue;
      }

      const actualDays = parseInt(row.actual_days.trim(), 10);
      if (isNaN(actualDays) || actualDays < 0) {
        validationErrors.push({ row: rowNum, message: "实收天数必须是非负整数" });
        continue;
      }

      const suspensionDays = parseInt(row.suspension_days.trim(), 10);
      if (isNaN(suspensionDays) || suspensionDays < 0) {
        validationErrors.push({ row: rowNum, message: "停课天数必须是非负整数" });
        continue;
      }

      // 构建验证后的数据
      validatedFeeConfigs.push({
        class_id: classIdResult.class_id ?? 0,
        semester_id: classIdResult.semester_id ?? 0,
        meal_fee_standard: mealFeeStandard,
        prepaid_days: prepaidDays,
        actual_days: actualDays,
        suspension_days: suspensionDays,
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

    // 如果是仅验证模式，返回成功结果
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        message: "验证通过"
      });
    }

    // 执行批量导入
    const result = await batchCreateOrUpdateFeeConfigs(validatedFeeConfigs);

    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("批量导入费用配置失败:", error);
    return NextResponse.json({ error: "批量导入费用配置失败" }, { status: 500 });
  }
}
