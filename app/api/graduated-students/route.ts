import { NextRequest, NextResponse } from "next/server";
import { getRawPostgres } from "@/lib/db";

/**
 * 获取毕业学生列表
 * 支持搜索、筛选、分页、排序
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const semester = searchParams.get("semester") || "";
    const grade = searchParams.get("grade") || "";
    const classFilter = searchParams.get("class") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort") || "student_no";
    const order = searchParams.get("order") || "asc";

    const offset = (page - 1) * limit;

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

    // 验证排序字段
    const allowedSortFields = [
      "student_no",
      "name",
      "graduation_date",
      "original_grade_name",
      "original_semester_name",
    ];
    const validSort = allowedSortFields.includes(sort) ? sort : "graduation_date";
    const validOrder = order === "asc" ? "ASC" : "DESC";

    // 获取总数
    const countResult = await sql.unsafe(
      `SELECT COUNT(*) as total FROM graduated_students gs ${whereClause}`,
      params
    ) as { total: bigint }[];
    const total = Number(countResult[0]?.total || 0);

    // 获取数据
    const students = await sql.unsafe(
      `SELECT
        gs.id,
        gs.student_no,
        gs.name,
        gs.gender,
        gs.parent_name,
        gs.parent_phone,
        gs.address,
        gs.is_nutrition_meal,
        gs.enrollment_date,
        gs.graduation_date,
        gs.original_class_name,
        gs.original_grade_name,
        gs.original_semester_name,
        gs.original_class_teacher_name
      FROM graduated_students gs
      ${whereClause}
      ORDER BY ${validSort} ${validOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取毕业学生失败:", error);
    return NextResponse.json(
      { success: false, error: "获取毕业学生失败" },
      { status: 500 }
    );
  }
}
