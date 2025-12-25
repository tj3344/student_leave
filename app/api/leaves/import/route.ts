import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { batchCreateLeaves, getStudentIdByInfo } from "@/lib/api/leaves";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { LeaveImportRow, LeaveInput } from "@/types";

/**
 * POST /api/leaves/import - 批量导入请假记录
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_IMPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const { leaves } = body as { leaves: LeaveImportRow[] };

    if (!Array.isArray(leaves) || leaves.length === 0) {
      return NextResponse.json({ error: "请假数据不能为空" }, { status: 400 });
    }

    // 转换和验证数据
    const validatedLeaves: LeaveInput[] = [];
    const validationErrors: Array<{
      row: number;
      message: string;
    }> = [];

    for (let i = 0; i < leaves.length; i++) {
      const row = leaves[i];
      const rowNum = i + 1;

      // 验证必填字段
      if (!row.student_no?.trim()) {
        validationErrors.push({ row: rowNum, message: "学号不能为空" });
        continue;
      }
      if (!row.student_name?.trim()) {
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
      if (!row.start_date?.trim()) {
        validationErrors.push({ row: rowNum, message: "开始日期不能为空" });
        continue;
      }
      if (!row.end_date?.trim()) {
        validationErrors.push({ row: rowNum, message: "结束日期不能为空" });
        continue;
      }
      if (!row.leave_days?.trim()) {
        validationErrors.push({ row: rowNum, message: "请假天数不能为空" });
        continue;
      }
      if (!row.reason?.trim()) {
        validationErrors.push({ row: rowNum, message: "请假事由不能为空" });
        continue;
      }

      // 验证日期格式
      const startDate = new Date(row.start_date.trim());
      const endDate = new Date(row.end_date.trim());
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        validationErrors.push({ row: rowNum, message: "日期格式不正确，请使用 YYYY-MM-DD 格式" });
        continue;
      }

      // 验证日期范围
      if (startDate > endDate) {
        validationErrors.push({ row: rowNum, message: "开始日期不能晚于结束日期" });
        continue;
      }

      // 验证请假天数
      const leaveDays = parseInt(row.leave_days.trim(), 10);
      if (isNaN(leaveDays) || leaveDays <= 0) {
        validationErrors.push({ row: rowNum, message: "请假天数必须大于0" });
        continue;
      }

      // 业务规则：请假天数必须大于3天
      if (leaveDays <= 3) {
        validationErrors.push({ row: rowNum, message: "请假天数必须大于3天" });
        continue;
      }

      // 获取学生ID
      const studentIdResult = getStudentIdByInfo(
        row.student_no.trim(),
        row.student_name.trim(),
        row.semester_name.trim(),
        row.grade_name.trim(),
        row.class_name.trim()
      );
      if (studentIdResult.error) {
        validationErrors.push({ row: rowNum, message: studentIdResult.error });
        continue;
      }

      // 获取学期ID
      const semesterId = studentIdResult.semester_id ?? 0;

      // 构建验证后的数据
      validatedLeaves.push({
        student_id: studentIdResult.student_id ?? 0,
        semester_id: semesterId,
        start_date: row.start_date.trim(),
        end_date: row.end_date.trim(),
        leave_days: leaveDays,
        reason: row.reason.trim(),
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
    const result = batchCreateLeaves(validatedLeaves, currentUser.id);

    return NextResponse.json({
      success: true,
      created: result.created,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("批量导入请假记录失败:", error);
    return NextResponse.json({ error: "批量导入请假记录失败" }, { status: 500 });
  }
}
