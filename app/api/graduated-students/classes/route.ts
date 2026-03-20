import { NextResponse } from "next/server";
import { getRawPostgres } from "@/lib/db";

/**
 * 获取毕业学生中的班级列表（用于筛选）
 */
export async function GET() {
  try {
    const sql = await getRawPostgres();

    const classes = await sql.unsafe(`
      SELECT DISTINCT original_class_name as name, original_grade_name as grade_name
      FROM graduated_students
      ORDER BY original_grade_name DESC, original_class_name
    `);

    return NextResponse.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("获取班级列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取班级列表失败" },
      { status: 500 }
    );
  }
}
