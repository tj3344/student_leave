import { getRawPostgres } from "@/lib/db";
import { validateOrderBy, SORT_FIELDS, DEFAULT_SORT_FIELDS } from "@/lib/utils/sql-security";
import type { Semester, SemesterInput, PaginationParams, PaginatedResponse } from "@/types";
import { cached, clearSemesterCache } from "@/lib/cache";

/**
 * 获取学期列表
 */
export async function getSemesters(params?: PaginationParams): Promise<PaginatedResponse<Semester> | Semester[]> {
  const pgClient = getRawPostgres();

  // 如果没有分页参数，返回所有数据
  if (!params?.page && !params?.limit) {
    return await pgClient.unsafe(
      "SELECT * FROM semesters ORDER BY is_current DESC, start_date DESC"
    ) as Semester[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params?.search) {
    whereClause = "WHERE name ILIKE $" + paramIndex++;
    queryParams.push(`%${params.search}%`);
  }

  // 获取总数
  const countResult = await pgClient.unsafe(
    `SELECT COUNT(*) as total FROM semesters ${whereClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  // 获取数据（使用白名单验证防止 SQL 注入）
  const { orderBy, order } = validateOrderBy(
    params?.sort,
    params?.order,
    { allowedFields: SORT_FIELDS.semesters, defaultField: DEFAULT_SORT_FIELDS.semesters }
  );

  queryParams.push(limit, offset);
  const data = await pgClient.unsafe(
    `SELECT * FROM semesters ${whereClause} ORDER BY ${orderBy} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    queryParams
  ) as Semester[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取学期详情
 */
export async function getSemesterById(id: number): Promise<Semester | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe("SELECT * FROM semesters WHERE id = $1", [id]) as Semester[];
  return result[0] || null;
}

/**
 * 获取当前学期（带10分钟缓存）
 */
export async function getCurrentSemester(): Promise<Semester | null> {
  return cached(
    "semester:current",
    async () => {
      const pgClient = getRawPostgres();
      const result = await pgClient.unsafe(
        "SELECT * FROM semesters WHERE is_current = true"
      ) as Semester[];
      return result[0] || null;
    },
    10 * 60 * 1000 // 10分钟缓存
  );
}

/**
 * 创建学期
 */
export async function createSemester(
  input: SemesterInput & { is_current?: boolean }
): Promise<{ success: boolean; message?: string; semesterId?: number }> {
  const pgClient = getRawPostgres();

  // 验证日期
  if (new Date(input.end_date) <= new Date(input.start_date)) {
    return { success: false, message: "结束日期必须大于开始日期" };
  }

  // 验证学校天数
  if (input.school_days <= 0) {
    return { success: false, message: "学校天数必须大于0" };
  }

  // 如果设置为当前学期，取消其他学期的当前状态
  if (input.is_current) {
    await pgClient.unsafe("UPDATE semesters SET is_current = false");
    // 清除缓存
    clearSemesterCache();
  }

  // 插入学期
  const result = await pgClient.unsafe(
    `INSERT INTO semesters (name, start_date, end_date, school_days, is_current, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      input.name,
      input.start_date,
      input.end_date,
      input.school_days,
      input.is_current ? true : false
    ]
  );

  return { success: true, semesterId: result[0]?.id };
}

/**
 * 更新学期
 */
export async function updateSemester(
  id: number,
  input: Partial<SemesterInput> & { is_current?: boolean }
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查学期是否存在
  const existing = await getSemesterById(id);
  if (!existing) {
    return { success: false, message: "学期不存在" };
  }

  // 验证日期
  const startDate = input.start_date || existing.start_date;
  const endDate = input.end_date || existing.end_date;
  if (new Date(endDate) <= new Date(startDate)) {
    return { success: false, message: "结束日期必须大于开始日期" };
  }

  // 验证学校天数
  if (input.school_days !== undefined && input.school_days <= 0) {
    return { success: false, message: "学校天数必须大于0" };
  }

  // 如果设置为当前学期，取消其他学期的当前状态
  if (input.is_current) {
    await pgClient.unsafe("UPDATE semesters SET is_current = false");
    // 清除缓存
    clearSemesterCache();
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number | boolean)[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.start_date !== undefined) {
    updates.push(`start_date = $${paramIndex++}`);
    values.push(input.start_date);
  }
  if (input.end_date !== undefined) {
    updates.push(`end_date = $${paramIndex++}`);
    values.push(input.end_date);
  }
  if (input.school_days !== undefined) {
    updates.push(`school_days = $${paramIndex++}`);
    values.push(input.school_days);
  }
  if (input.is_current !== undefined) {
    updates.push(`is_current = $${paramIndex++}`);
    values.push(input.is_current);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  await pgClient.unsafe(
    `UPDATE semesters SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    values
  );

  return { success: true };
}

/**
 * 删除学期
 */
export async function deleteSemester(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查学期是否存在
  const existing = await getSemesterById(id);
  if (!existing) {
    return { success: false, message: "学期不存在" };
  }

  // 检查是否有关联的请假记录
  const hasLeaveRecords = await pgClient.unsafe(
    "SELECT COUNT(*) as count FROM leave_records WHERE semester_id = $1",
    [id]
  );

  if (hasLeaveRecords[0]?.count > 0) {
    return { success: false, message: "该学期存在请假记录，无法删除" };
  }

  // 删除学期
  await pgClient.unsafe("DELETE FROM semesters WHERE id = $1", [id]);

  // 清除缓存
  clearSemesterCache();

  return { success: true };
}

/**
 * 设置当前学期
 */
export async function setCurrentSemester(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查学期是否存在
  const existing = await getSemesterById(id);
  if (!existing) {
    return { success: false, message: "学期不存在" };
  }

  // 取消所有学期的当前状态
  await pgClient.unsafe("UPDATE semesters SET is_current = false");

  // 设置当前学期
  await pgClient.unsafe("UPDATE semesters SET is_current = true WHERE id = $1", [id]);

  // 清除缓存
  clearSemesterCache();

  return { success: true };
}
