import { NextResponse } from "next/server";
import { getRawPostgres } from "@/lib/db";

/**
 * 获取毕业学生中的年级列表（用于筛选）
 */
export async function GET() {
  try {
    const sql = await getRawPostgres();

    const grades = await sql.unsafe(`
      SELECT DISTINCT original_grade_name as name
      FROM graduated_students
      ORDER BY original_grade_name DESC
    `);

    return NextResponse.json({
      success: true,
      data: grades,
    });
  } catch (error) {
    console.error("获取年级列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取年级列表失败" },
      { status: 500 }
    );
  }
}
