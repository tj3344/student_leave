import { getRawPostgres } from "@/lib/db";
import { validateOrderBy, SORT_FIELDS } from "@/lib/utils/sql-security";
import type { Grade, GradeInput, PaginationParams, PaginatedResponse } from "@/types";

/**
 * 获取年级列表
 */
export async function getGrades(params?: PaginationParams & { semester_id?: number }): Promise<PaginatedResponse<Grade> | Grade[]> {
  const pgClient = getRawPostgres();

  // 如果没有分页参数，返回所有数据
  if (!params?.page && !params?.limit) {
    let query = "SELECT * FROM grades";
    const queryParams: (string | number)[] = [];

    if (params?.semester_id) {
      query += " WHERE semester_id = $1";
      queryParams.push(params.semester_id);
    }

    query += " ORDER BY sort_order ASC, id ASC";

    return await pgClient.unsafe(query, queryParams) as Grade[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params?.search) {
    // 使用 ILIKE 进行不区分大小写的搜索
    whereClause = "WHERE name ILIKE $" + (paramIndex++);
    queryParams.push(`%${params.search}%`);
  }

  // 如果指定了学期，添加学期过滤
  if (params?.semester_id) {
    if (whereClause) {
      whereClause += " AND semester_id = $" + (paramIndex++);
    } else {
      whereClause = "WHERE semester_id = $" + (paramIndex++);
    }
    queryParams.push(params.semester_id);
  }

  // 获取总数
  const countResult = await pgClient.unsafe(
    `SELECT COUNT(*) as total FROM grades ${whereClause}`,
    queryParams
  ) as { total: number }[];
  const total = countResult[0]?.total || 0;

  // 获取数据（使用白名单验证防止 SQL 注入）
  const { orderBy, order } = validateOrderBy(
    params?.sort,
    params?.order,
    { allowedFields: SORT_FIELDS.grades, defaultField: "g.created_at" }
  );
  queryParams.push(limit, offset);
  const data = await pgClient.unsafe(
    `SELECT * FROM grades ${whereClause} ORDER BY ${orderBy} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    queryParams
  ) as Grade[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取年级详情
 */
export async function getGradeById(id: number): Promise<Grade | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe("SELECT * FROM grades WHERE id = $1", [id]) as Grade[];
  return result[0] || null;
}

/**
 * 创建年级
 */
export async function createGrade(
  input: GradeInput
): Promise<{ success: boolean; message?: string; gradeId?: number }> {
  const pgClient = getRawPostgres();

  // 检查年级名称是否已存在（在同一学期内）
  const existing = await pgClient.unsafe("SELECT id FROM grades WHERE name = $1 AND semester_id = $2", [input.name, input.semester_id]);
  if (existing.length > 0) {
    return { success: false, message: "该学期下年级名称已存在" };
  }

  // 获取最大排序号
  const maxSortOrderResult = await pgClient.unsafe(
    "SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM grades WHERE semester_id = $1",
    [input.semester_id]
  ) as { max_sort: number }[];
  const maxSortOrder = maxSortOrderResult[0]?.max_sort || 0;
  const sortOrder = input.sort_order ?? maxSortOrder + 1;

  // 插入年级
  const result = await pgClient.unsafe(
    "INSERT INTO grades (semester_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id",
    [input.semester_id, input.name, sortOrder]
  );

  return { success: true, gradeId: result[0]?.id };
}

/**
 * 更新年级
 */
export async function updateGrade(
  id: number,
  input: Partial<GradeInput>
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查年级是否存在
  const existing = await getGradeById(id);
  if (!existing) {
    return { success: false, message: "年级不存在" };
  }

  // 如果更新名称，检查是否重复
  if (input.name && input.name !== existing.name) {
    const duplicate = await pgClient.unsafe("SELECT id FROM grades WHERE name = $1 AND id != $2", [input.name, id]);
    if (duplicate.length > 0) {
      return { success: false, message: "年级名称已存在" };
    }
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.sort_order !== undefined) {
    updates.push(`sort_order = $${paramIndex++}`);
    values.push(input.sort_order);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  values.push(id);

  await pgClient.unsafe(`UPDATE grades SET ${updates.join(", ")} WHERE id = $${paramIndex}`, values);

  return { success: true };
}

/**
 * 删除年级
 */
export async function deleteGrade(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查年级是否存在
  const existing = await getGradeById(id);
  if (!existing) {
    return { success: false, message: "年级不存在" };
  }

  // 检查是否有关联的班级
  const hasClasses = await pgClient.unsafe(
    "SELECT COUNT(*) as count FROM classes WHERE grade_id = $1",
    [id]
  ) as { count: number }[];

  if (hasClasses[0]?.count > 0) {
    return { success: false, message: "该年级下存在班级，无法删除" };
  }

  // 删除年级
  await pgClient.unsafe("DELETE FROM grades WHERE id = $1", [id]);

  return { success: true };
}

/**
 * 批量更新年级排序
 */
export async function updateGradesOrder(
  updates: { id: number; sort_order: number }[]
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  try {
    for (const item of updates) {
      await pgClient.unsafe("UPDATE grades SET sort_order = $1 WHERE id = $2", [item.sort_order, item.id]);
    }
    return { success: true };
  } catch {
    return { success: false, message: "更新排序失败" };
  }
}
