import { NextRequest, NextResponse } from "next/server";
import { getRawPostgres } from "@/lib/db";

/**
 * 导出毕业学生数据为 Excel
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const semester = searchParams.get("semester") || "";
    const grade = searchParams.get("grade") || "";
    const classFilter = searchParams.get("class") || "";

    const sql = await getRawPostgres();

    // 构建查询条件
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(gs.student_no ILIKE $${paramIndex} OR gs.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (semester && semester !== "all") {
      conditions.push(`gs.original_semester_name = $${paramIndex}`);
      params.push(semester);
      paramIndex++;
    }

    if (grade && grade !== "all") {
      conditions.push(`gs.original_grade_name = $${paramIndex}`);
      params.push(grade);
      paramIndex++;
    }

    if (classFilter && classFilter !== "all") {
      conditions.push(`gs.original_class_name = $${paramIndex}`);
      params.push(classFilter);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 获取所有符合条件的数据
    const students = await sql.unsafe(
      `SELECT
        gs.student_no as "学号",
        gs.name as "姓名",
        gs.gender as "性别",
        gs.original_class_name as "班级",
        gs.original_grade_name as "年级",
        gs.original_semester_name as "学期",
        gs.original_class_teacher_name as "班主任",
        gs.parent_name as "家长姓名",
        gs.parent_phone as "联系电话",
        gs.address as "家庭住址",
        CASE WHEN gs.is_nutrition_meal THEN '是' ELSE '否' END as "营养餐",
        gs.enrollment_date as "入学日期",
        TO_CHAR(gs.graduation_date, 'YYYY-MM-DD') as "毕业日期"
      FROM graduated_students gs
      ${whereClause}
      ORDER BY gs.graduation_date DESC, gs.student_no`,
      params
    );

    // 使用简单的 CSV 格式导出
    if (students.length > 0) {
      const headers = Object.keys(students[0]);
      const csvContent = [
        headers.join(","),
        ...students.map((row: any) =>
          headers.map((header) => {
            const value = row[header];
            // 处理包含逗号的字段
            if (value && value.toString().includes(",")) {
              return `"${value}"`;
            }
            return value || "";
          }).join(",")
        ),
      ].join("\n");

      // 返回 CSV 文件
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="毕业学生_${new Date().toLocaleDateString()}.csv"`,
        },
      });
    }

    return new NextResponse("", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="毕业学生_${new Date().toLocaleDateString()}.csv"`,
      },
    });
  } catch (error) {
    console.error("导出毕业学生失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
