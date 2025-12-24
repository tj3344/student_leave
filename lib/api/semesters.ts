import { getDb } from "@/lib/db";
import type { Semester, SemesterInput, PaginationParams, PaginatedResponse } from "@/types";

/**
 * 获取学期列表
 */
export function getSemesters(params?: PaginationParams): PaginatedResponse<Semester> | Semester[] {
  const db = getDb();

  // 如果没有分页参数，返回所有数据
  if (!params?.page && !params?.limit) {
    return db
      .prepare("SELECT * FROM semesters ORDER BY is_current DESC, start_date DESC")
      .all() as Semester[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "";
  const queryParams: (string | number)[] = [];

  if (params?.search) {
    whereClause = "WHERE name LIKE ?";
    queryParams.push(`%${params.search}%`);
  }

  // 获取总数
  const countResult = db
    .prepare(`SELECT COUNT(*) as total FROM semesters ${whereClause}`)
    .get(...queryParams) as { total: number };
  const total = countResult.total;

  // 获取数据
  const order = params?.order || "desc";
  const sort = params?.sort || "start_date";
  const data = db
    .prepare(
      `SELECT * FROM semesters ${whereClause} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`
    )
    .all(...queryParams, limit, offset) as Semester[];

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
export function getSemesterById(id: number): Semester | null {
  const db = getDb();
  return db.prepare("SELECT * FROM semesters WHERE id = ?").get(id) as Semester | null;
}

/**
 * 获取当前学期
 */
export function getCurrentSemester(): Semester | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM semesters WHERE is_current = 1")
    .get() as Semester | null;
}

/**
 * 创建学期
 */
export function createSemester(
  input: SemesterInput & { is_current?: boolean }
): { success: boolean; message?: string; semesterId?: number } {
  const db = getDb();

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
    db.prepare("UPDATE semesters SET is_current = 0").run();
  }

  // 插入学期
  const result = db
    .prepare(
      `INSERT INTO semesters (name, start_date, end_date, school_days, is_current)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.start_date,
      input.end_date,
      input.school_days,
      input.is_current ? 1 : 0
    );

  return { success: true, semesterId: result.lastInsertRowid as number };
}

/**
 * 更新学期
 */
export function updateSemester(
  id: number,
  input: Partial<SemesterInput> & { is_current?: boolean }
): { success: boolean; message?: string } {
  const db = getDb();

  // 检查学期是否存在
  const existing = getSemesterById(id);
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
    db.prepare("UPDATE semesters SET is_current = 0").run();
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.start_date !== undefined) {
    updates.push("start_date = ?");
    values.push(input.start_date);
  }
  if (input.end_date !== undefined) {
    updates.push("end_date = ?");
    values.push(input.end_date);
  }
  if (input.school_days !== undefined) {
    updates.push("school_days = ?");
    values.push(input.school_days);
  }
  if (input.is_current !== undefined) {
    updates.push("is_current = ?");
    values.push(input.is_current ? 1 : 0);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  db.prepare(`UPDATE semesters SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return { success: true };
}

/**
 * 删除学期
 */
export function deleteSemester(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查学期是否存在
  const existing = getSemesterById(id);
  if (!existing) {
    return { success: false, message: "学期不存在" };
  }

  // 检查是否有关联的请假记录
  const hasLeaveRecords = db
    .prepare("SELECT COUNT(*) as count FROM leave_records WHERE semester_id = ?")
    .get(id) as { count: number };

  if (hasLeaveRecords.count > 0) {
    return { success: false, message: "该学期存在请假记录，无法删除" };
  }

  // 删除学期
  db.prepare("DELETE FROM semesters WHERE id = ?").run(id);

  return { success: true };
}

/**
 * 设置当前学期
 */
export function setCurrentSemester(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查学期是否存在
  const existing = getSemesterById(id);
  if (!existing) {
    return { success: false, message: "学期不存在" };
  }

  // 取消所有学期的当前状态
  db.prepare("UPDATE semesters SET is_current = 0").run();

  // 设置当前学期
  db.prepare("UPDATE semesters SET is_current = 1 WHERE id = ?").run(id);

  return { success: true };
}
