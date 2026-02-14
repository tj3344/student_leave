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
 * 支持中文数字（一、二、三...）和阿拉伯数字（1、2、3...）
 * @param gradeName 原年级名称（如 "1年级", "2年级", "一年级", "二年级"）
 * @returns 新年级名称（如 "2年级", "3年级", "二年级", "三年级"）
 */
function incrementGradeName(gradeName: string): string {
  // 中文数字映射
  const chineseNumeralMap: Record<string, number> = {
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    // 正式写法
    "壹": 1,
    "贰": 2,
    "叁": 3,
    "肆": 4,
    "伍": 5,
    "陆": 6,
    "柒": 7,
    "捌": 8,
    "玖": 9,
  };

  const numberToChinese: Record<number, string> = {
    1: "一",
    2: "二",
    3: "三",
    4: "四",
    5: "五",
    6: "六",
    7: "七",
    8: "八",
    9: "九",
  };

  // 首先尝试匹配中文数字（优先处理）
  for (const [chinese, number] of Object.entries(chineseNumeralMap)) {
    if (gradeName.includes(chinese)) {
      const newNumber = number + 1;
      if (newNumber > 9) {
        // 超过九年级，返回原名称
        return gradeName;
      }
      const newChinese = numberToChinese[newNumber];
      return gradeName.replace(chinese, newChinese);
    }
  }

  // 回退到阿拉伯数字处理
  const match = gradeName.match(/(\d+)/);
  if (!match) {
    // 如果没有数字，返回原名称
    return gradeName;
  }

  const number = parseInt(match[1], 10);
  const newNumber = number + 1;
  return gradeName.replace(match[0], newNumber.toString());
}

/**
 * 获取升级预览信息
 * @param sourceSemesterId 源学期ID
 * @param targetSemesterId 目标学期ID
 * @param upgradeMode 迁移模式（"year" 学年迁移，"semester" 学期迁移）
 * @returns 升级预览信息
 */
export async function getUpgradePreview(
  sourceSemesterId: number,
  targetSemesterId: number,
  upgradeMode: "semester" | "year" = "year"
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

  // 获取源学期的班级和班主任信息
  const classesResult = await pgClient.unsafe(
    `SELECT c.id, c.name, c.class_teacher_id,
            g.name as grade_name, u.real_name as teacher_name
     FROM classes c
     JOIN grades g ON c.grade_id = g.id
     LEFT JOIN users u ON c.class_teacher_id = u.id
     WHERE g.semester_id = $1`,
    [sourceSemesterId]
  ) as Array<{
      id: number;
      name: string;
      class_teacher_id: number | null;
      grade_name: string;
      teacher_name: string | null;
    }>;

  const classTeacherPreview = classesResult.map((c) => ({
    old_class_id: c.id,
    old_class_name: c.name,
    old_grade_name: c.grade_name,
    old_teacher_id: c.class_teacher_id ?? undefined,
    old_teacher_name: c.teacher_name ?? undefined,
    will_migrate: c.class_teacher_id !== null,
  }));

  // 学年迁移时查询六年级毕业信息
  let graduatingStudentsCount = 0;
  let graduationPreview: Array<{
    grade_name: string;
    class_name: string;
    student_count: number;
  }> = [];

  if (upgradeMode === "year") {
    // 查找六年级（使用正则精确匹配单个数字6）
    const sixthGradeResult = await pgClient.unsafe(
      `SELECT g.id, g.name
       FROM grades g
       WHERE g.semester_id = $1 AND g.name ~ '^[^0-9]*6[^0-9]*$'`,
      [sourceSemesterId]
    ) as Array<{ id: number; name: string }>;

    if (sixthGradeResult.length > 0) {
      const sixthGradeIds = sixthGradeResult.map((g) => g.id);

      // 统计毕业学生数量
      const countResult = await pgClient.unsafe(
        `SELECT COUNT(DISTINCT s.id) as count
         FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE c.grade_id = ANY($1) AND s.is_active = true`,
        [sixthGradeIds]
      ) as Array<{ count: bigint }>;
      graduatingStudentsCount = Number(countResult[0]?.count || 0);

      // 获取班级级别的毕业预览
      const classResult = await pgClient.unsafe(
        `SELECT c.name as class_name, g.name as grade_name, COUNT(s.id) as student_count
         FROM classes c
         JOIN grades g ON c.grade_id = g.id
         LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
         WHERE c.grade_id = ANY($1)
         GROUP BY c.id, c.name, g.name
         ORDER BY c.name`,
        [sixthGradeIds]
      ) as Array<{ class_name: string; grade_name: string; student_count: bigint }>;

      graduationPreview = classResult.map((row) => ({
        grade_name: row.grade_name,
        class_name: row.class_name,
        student_count: Number(row.student_count),
      }));
    }
  }

  // 检查学号冲突（源学期的学生在目标学期是否已存在）
  // 注意：由于唯一约束是 (class_id, student_no)，只有当目标学期的班级中
  // 已经存在相同学号的学生时才会发生冲突
  let conflictingStudentsCount = 0;
  const sourceClassIds = classesResult.map((c) => c.id);
  if (sourceClassIds.length > 0) {
    const conflictResult = await pgClient.unsafe(
      `SELECT COUNT(DISTINCT s1.student_no) as count
       FROM students s1
       WHERE s1.class_id = ANY($1)
         AND EXISTS (
           SELECT 1
           FROM students s2
           JOIN classes c ON s2.class_id = c.id
           WHERE c.semester_id = $2
             AND s2.student_no = s1.student_no
         )`,
      [sourceClassIds, targetSemesterId]
    ) as Array<{ count: bigint }>;
    conflictingStudentsCount = Number(conflictResult[0]?.count || 0);
  }

  // 学年迁移时检测年级名称冲突
  let conflictingGradesCount = 0;
  const conflictingGradesNames: string[] = [];
  const previewGrades: Array<{
    id: number;
    name: string;
    original_name?: string;
    class_count: number;
    student_count: number;
  }> = [];

  for (const g of gradesResult) {
    const newName = upgradeMode === "year" ? incrementGradeName(g.name) : g.name;

    if (upgradeMode === "year") {
      // 查询目标学期是否已存在递增后的年级名称
      const existingResult = await pgClient.unsafe(
        `SELECT id FROM grades WHERE semester_id = $1 AND name = $2`,
        [targetSemesterId, newName]
      ) as Array<{ id: number }>;

      if (existingResult.length > 0) {
        conflictingGradesCount++;
        conflictingGradesNames.push(`${g.name} → ${newName}`);
      }
    }

    previewGrades.push({
      id: g.id,
      name: newName,
      original_name: g.name,
      class_count: g.class_count,
      student_count: g.student_count,
    });
  }

  // 生成预览数据（显示迁移前后的年级名称变化）
  const previewData = previewGrades.map((g) => ({
    old_grade: g.original_name || g.name,
    new_grade: g.name,
    class_count: g.class_count,
    student_count: g.student_count,
  }));

  return {
    source_semester: sourceSemester,
    target_semester: targetSemester,
    available_grades: previewGrades,
    selected_grades: undefined,
    preview_data: previewData,
    total_classes: gradesResult.reduce((sum, g) => sum + g.class_count, 0),
    total_students: gradesResult.reduce((sum, g) => sum + g.student_count, 0),
    class_teacher_preview: classTeacherPreview,
    graduating_students_count: graduatingStudentsCount,
    graduation_preview: graduationPreview,
    conflicting_students_count: conflictingStudentsCount,
    conflicting_grades_count: conflictingGradesCount > 0 ? conflictingGradesCount : undefined,
    conflicting_grades_names: conflictingGradesNames.length > 0 ? conflictingGradesNames : undefined,
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

  // 获取迁移模式，默认为学年迁移
  const upgradeMode = request.upgrade_mode || "year";

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

  try {
    const result = await pgClient.begin(async (sql) => {
      const warnings: string[] = [];
      let gradesCreated = 0;
      let classesCreated = 0;
      let studentsCreated = 0;
      let graduatedCount = 0;

      // 步骤0: 处理六年级学生毕业（仅学年迁移）
      if (upgradeMode === "year") {
        const sixthGrades = await sql.unsafe(
          `SELECT id FROM grades
           WHERE semester_id = $1 AND name ~ '^[^0-9]*6[^0-9]*$'`,
          [request.source_semester_id]
        ) as Array<{ id: number }>;

        if (sixthGrades.length > 0) {
          const sixthGradeIds = sixthGrades.map((g) => g.id);
          const classes = await sql.unsafe(
            `SELECT id FROM classes WHERE grade_id = ANY($1)`,
            [sixthGradeIds]
          ) as Array<{ id: number }>;

          if (classes.length > 0) {
            const classIds = classes.map((c) => c.id);
            const graduateResult = await sql.unsafe(
              `UPDATE students
               SET is_active = false, updated_at = CURRENT_TIMESTAMP
               WHERE class_id = ANY($1) AND is_active = true
               RETURNING id`,
              [classIds]
            );
            graduatedCount = graduateResult.length;
          }
        }
      }

      // 步骤1: 为每个选中的年级创建或获取目标年级
      const gradeIdMap: Record<number, number> = {}; // 旧年级ID -> 新年级ID

      for (const grade of selectedGradesResult) {
        // 根据迁移模式决定新年级名称
        const newGradeName = upgradeMode === "year"
          ? incrementGradeName(grade.name)
          : grade.name;

        // 检查目标学期是否已存在该年级名称
        const existingGrade = await sql.unsafe(
          `SELECT id FROM grades WHERE semester_id = $1 AND name = $2`,
          [request.target_semester_id, newGradeName]
        ) as { id: number }[];

        if (existingGrade.length > 0) {
          // 使用已存在的年级
          gradeIdMap[grade.id] = existingGrade[0].id;
        } else {
          // 创建新年级
          const newGradeResult = await sql.unsafe(
            `INSERT INTO grades (semester_id, name, sort_order, created_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
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
        const classesResult = await sql.unsafe(
          `SELECT id, name, meal_fee, class_teacher_id
           FROM classes
           WHERE grade_id = $1`,
          [parseInt(oldGradeId, 10)]
        ) as Array<{
            id: number;
            name: string;
            meal_fee: number;
            class_teacher_id: number | null;
          }>;

        for (const cls of classesResult) {
          // 检查目标学期的目标年级中是否已存在同名班级
          const existingClass = await sql.unsafe(
            `SELECT id FROM classes WHERE semester_id = $1 AND grade_id = $2 AND name = $3`,
            [request.target_semester_id, newGradeId, cls.name]
          ) as { id: number }[];

          let newClassId: number;
          if (existingClass.length > 0) {
            // 使用已存在的班级
            newClassId = existingClass[0].id;
          } else {
            // 创建新班级
            const newClassResult = await sql.unsafe(
              `INSERT INTO classes (semester_id, grade_id, name, class_teacher_id, meal_fee, student_count, created_at, updated_at)
               VALUES ($1, $2, $3, NULL, $4, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id`,
              [
                request.target_semester_id,
                newGradeId,
                cls.name,
                cls.meal_fee
              ]
            ) as { id: number }[];
            newClassId = newClassResult[0].id;
            classesCreated++;
          }

          classIdMap[cls.id] = newClassId;
        }
      }

      // 步骤2.5: 处理班主任迁移（如果启用）
      if (request.preserve_class_teachers !== false) {
        const oldClassIds = Object.keys(classIdMap).map((id) => parseInt(id, 10));

        // 获取需要迁移的班主任
        const teachersToMigrate = await sql.unsafe(
          `SELECT c.id as old_class_id, c.class_teacher_id
           FROM classes c
           WHERE c.id = ANY($1) AND c.class_teacher_id IS NOT NULL`,
          [oldClassIds]
        ) as Array<{
            old_class_id: number;
            class_teacher_id: number;
          }>;

        // 迁移班主任到新班级
        for (const teacher of teachersToMigrate) {
          const newClassId = classIdMap[teacher.old_class_id];
          if (!newClassId) continue;

          // 更新新班级的班主任
          await sql.unsafe(
            `UPDATE classes SET class_teacher_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [teacher.class_teacher_id, newClassId]
          );

          // 确保教师角色为 class_teacher
          await sql.unsafe(
            `UPDATE users SET role = 'class_teacher', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [teacher.class_teacher_id]
          );
        }

        // 清除原班级的班主任关联
        if (teachersToMigrate.length > 0) {
          await sql.unsafe(
            `UPDATE classes SET class_teacher_id = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = ANY($1)`,
            [oldClassIds]
          );
        }
      }

      // 步骤3: 复制学生基础信息
      // 触发器会自动维护 classes.student_count
      for (const [oldClassId, newClassId] of Object.entries(classIdMap)) {
        const studentsResult = await sql.unsafe(
          `SELECT student_no, name, gender, parent_name, parent_phone,
                  address, is_nutrition_meal, enrollment_date, is_active
           FROM students
           WHERE class_id = $1`,
          [parseInt(oldClassId, 10)]
        ) as Array<{
            student_no: string;
            name: string;
            gender?: string;
            parent_name?: string;
            parent_phone?: string;
            address?: string;
            is_nutrition_meal: boolean;
            enrollment_date?: string;
            is_active: boolean;
          }>;

        for (const student of studentsResult) {
          // 使用 ON CONFLICT DO NOTHING 避免重复学号错误
          // 注意：唯一约束是 (class_id, student_no)，允许同一学号在不同学期存在
          const insertResult = await sql.unsafe(
            `INSERT INTO students (student_no, name, gender, class_id,
                                    parent_name, parent_phone, address, is_nutrition_meal,
                                    enrollment_date, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT (class_id, student_no) DO NOTHING
                 RETURNING (xmax = 0) AS inserted`,
            [
              student.student_no,
              student.name,
              student.gender || null,
              newClassId,
              student.parent_name || null,
              student.parent_phone || null,
              student.address || null,
              student.is_nutrition_meal,
              student.enrollment_date || null,
              student.is_active
            ]
          ) as { inserted: number }[];

          // 检查是否插入成功（xmax > 0 表示有行被插入）
          if (insertResult.length > 0 && insertResult[0].inserted > 0) {
            studentsCreated++;
          } else {
            // 没有插入说明学号已存在（同一班级内）
            warnings.push(`学号 ${student.student_no} 已存在，跳过该学生`);
          }
        }
      }

      return {
        grades_created: gradesCreated,
        classes_created: classesCreated,
        students_created: studentsCreated,
        graduated_students_count: graduatedCount,
        skipped_count: warnings.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    });

    return {
      success: true,
      message: upgradeMode === "year" ? "学年升级成功" : "学期迁移成功",
      data: result,
    };
  } catch (error) {
    console.error("升级失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "升级失败，请稍后重试",
    };
  }
}
