import { getRawPostgres } from "@/lib/db";
import { getSemesterById } from "@/lib/api/semesters";
import type {
  SemesterUpgradeRequest,
  SemesterUpgradeResult,
  UpgradePreview,
} from "@/types";

/**
 * 年级名称递增映射
 * 提取年级名称中的数字部分，+1 后得到新年级名称
 * @param gradeName 原年级名称（如 "1年级", "2年级"）
 * @returns 新年级名称（如 "2年级", "3年级"）
 */
function incrementGradeName(gradeName: string): string {
  // 提取数字部分
  const match = gradeName.match(/(\d+)/);
  if (!match) {
    // 如果没有数字，返回原名称
    return gradeName;
  }

  const number = parseInt(match[1], 10);
  const newNumber = number + 1;
  return gradeName.replace(match[1], newNumber.toString());
}

/**
 * 获取升级预览信息
 * @param sourceSemesterId 源学期ID
 * @param targetSemesterId 目标学期ID
 * @returns 升级预览信息
 */
export async function getUpgradePreview(
  sourceSemesterId: number,
  targetSemesterId: number
): Promise<UpgradePreview | null> {
  const pgClient = getRawPostgres();

  // 检查源学期是否存在
  const sourceSemester = await getSemesterById(sourceSemesterId);
  if (!sourceSemester) {
    return null;
  }

  // 检查目标学期是否存在
  const targetSemester = await getSemesterById(targetSemesterId);
  if (!targetSemester) {
    return null;
  }

  // 获取源学期的所有年级信息
  const gradesResult = await pgClient.unsafe(
    `SELECT g.id, g.name, g.sort_order,
            COUNT(DISTINCT c.id) as class_count,
            COUNT(DISTINCT s.id) as student_count
     FROM grades g
     LEFT JOIN classes c ON c.grade_id = g.id
     LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
     WHERE g.semester_id = $1
     GROUP BY g.id
     ORDER BY g.sort_order`,
    [sourceSemesterId]
  ) as Array<{
      id: number;
      name: string;
      sort_order: number;
      class_count: number;
      student_count: number;
    }>;

  return {
    source_semester: sourceSemester,
    target_semester: targetSemester,
    available_grades: gradesResult.map((g) => ({
      id: g.id,
      name: g.name,
      class_count: g.class_count,
      student_count: g.student_count,
    })),
    total_classes: gradesResult.reduce((sum, g) => sum + g.class_count, 0),
    total_students: gradesResult.reduce((sum, g) => sum + g.student_count, 0),
  };
}

/**
 * 执行学期升级
 * @param request 升级请求
 * @returns 升级结果
 */
export async function upgradeSemester(
  request: SemesterUpgradeRequest
): Promise<SemesterUpgradeResult> {
  const pgClient = getRawPostgres();

  // 1. 验证源学期是否存在
  const sourceSemester = await getSemesterById(request.source_semester_id);
  if (!sourceSemester) {
    return {
      success: false,
      message: "源学期不存在",
    };
  }

  // 2. 验证目标学期是否存在
  const targetSemester = await getSemesterById(request.target_semester_id);
  if (!targetSemester) {
    return {
      success: false,
      message: "目标学期不存在",
    };
  }

  // 3. 验证是否选择了年级
  if (!request.grade_ids || request.grade_ids.length === 0) {
    return {
      success: false,
      message: "请至少选择一个年级",
    };
  }

  // 4. 验证选择的年级是否属于源学期
  const placeholders = request.grade_ids.map((_, i) => `$${i + 1}`).join(",");
  const selectedGradesResult = await pgClient.unsafe(
    `SELECT id, name, sort_order
     FROM grades
     WHERE id IN (${placeholders})
     AND semester_id = $${request.grade_ids.length + 1}`,
    [...request.grade_ids, request.source_semester_id]
  ) as Array<{
      id: number;
      name: string;
      sort_order: number;
    }>;

  if (selectedGradesResult.length !== request.grade_ids.length) {
    return {
      success: false,
      message: "选择的年级不属于源学期",
    };
  }

  const warnings: string[] = [];
  let gradesCreated = 0;
  let classesCreated = 0;
  let studentsCreated = 0;

  try {
    // 使用事务确保数据一致性
    // PostgreSQL 使用 BEGIN/COMMIT 语法
    await pgClient.unsafe("BEGIN");

    // 步骤1: 为每个选中的年级创建或获取目标年级
    const gradeIdMap: Record<number, number> = {}; // 旧年级ID -> 新年级ID

    for (const grade of selectedGradesResult) {
      const newGradeName = incrementGradeName(grade.name);

      // 检查目标学期是否已存在该年级名称
      const existingGrade = await pgClient.unsafe(
        `SELECT id FROM grades WHERE semester_id = $1 AND name = $2`,
        [request.target_semester_id, newGradeName]
      ) as { id: number }[];

      if (existingGrade.length > 0) {
        // 使用已存在的年级
        gradeIdMap[grade.id] = existingGrade[0].id;
      } else {
        // 创建新年级
        const newGradeResult = await pgClient.unsafe(
          `INSERT INTO grades (semester_id, name, sort_order)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [request.target_semester_id, newGradeName, grade.sort_order]
        ) as { id: number }[];

        gradeIdMap[grade.id] = newGradeResult[0].id;
        gradesCreated++;
      }
    }

    // 步骤2: 复制班级（班主任清空，student_count 初始为0）
    const classIdMap: Record<number, number> = {}; // 旧班级ID -> 新班级ID

    for (const [oldGradeId, newGradeId] of Object.entries(gradeIdMap)) {
      const classesResult = await pgClient.unsafe(
        `SELECT id, name, meal_fee
         FROM classes
         WHERE grade_id = $1`,
        [parseInt(oldGradeId, 10)]
      ) as Array<{
          id: number;
          name: string;
          meal_fee: number;
        }>;

      for (const cls of classesResult) {
        const newClassResult = await pgClient.unsafe(
          `INSERT INTO classes (semester_id, grade_id, name, class_teacher_id, meal_fee, student_count)
           VALUES ($1, $2, $3, NULL, $4, 0)
           RETURNING id`,
          [
            request.target_semester_id,
            newGradeId,
            cls.name,
            cls.meal_fee
          ]
        ) as { id: number }[];

        classIdMap[cls.id] = newClassResult[0].id;
        classesCreated++;
      }
    }

    // 步骤3: 复制学生基础信息
    // 触发器会自动维护 classes.student_count
    for (const [oldClassId, newClassId] of Object.entries(classIdMap)) {
      const studentsResult = await pgClient.unsafe(
        `SELECT student_no, name, gender, birth_date, parent_name, parent_phone,
                address, is_nutrition_meal, enrollment_date, is_active
         FROM students
         WHERE class_id = $1`,
        [parseInt(oldClassId, 10)]
      ) as Array<{
          student_no: string;
          name: string;
          gender?: string;
          birth_date?: string;
          parent_name?: string;
          parent_phone?: string;
          address?: string;
          is_nutrition_meal: boolean;
          enrollment_date?: string;
          is_active: boolean;
        }>;

      for (const student of studentsResult) {
        try {
          await pgClient.unsafe(
            `INSERT INTO students (student_no, name, gender, class_id, birth_date,
                                  parent_name, parent_phone, address, is_nutrition_meal,
                                  enrollment_date, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              student.student_no,
              student.name,
              student.gender || null,
              newClassId,
              student.birth_date || null,
              student.parent_name || null,
              student.parent_phone || null,
              student.address || null,
              student.is_nutrition_meal,
              student.enrollment_date || null,
              student.is_active
            ]
          );
          studentsCreated++;
        } catch (error: unknown) {
          // 如果学号重复，记录警告但继续处理其他学生
          if (error instanceof Error && error.message?.includes("duplicate key")) {
            warnings.push(`学号 ${student.student_no} 已存在，跳过该学生`);
          } else {
            await pgClient.unsafe("ROLLBACK");
            throw error;
          }
        }
      }
    }

    await pgClient.unsafe("COMMIT");

    return {
      success: true,
      message: "学生升级成功",
      data: {
        grades_created: gradesCreated,
        classes_created: classesCreated,
        students_created: studentsCreated,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  } catch (error) {
    await pgClient.unsafe("ROLLBACK");
    console.error("升级失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "升级失败，请稍后重试",
    };
  }
}
