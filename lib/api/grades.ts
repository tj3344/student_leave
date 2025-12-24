import { getDb } from "@/lib/db";
import type { Grade, GradeInput, PaginationParams, PaginatedResponse } from "@/types";

/**
 * 获取年级列表
 */
export function getGrades(params?: PaginationParams): PaginatedResponse<Grade> | Grade[] {
  const db = getDb();

  // 如果没有分页参数，返回所有数据
  if (!params?.page && !params?.limit) {
    return db
      .prepare("SELECT * FROM grades ORDER BY sort_order ASC, id ASC")
      .all() as Grade[];
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
    .prepare(`SELECT COUNT(*) as total FROM grades ${whereClause}`)
    .get(...queryParams) as { total: number };
  const total = countResult.total;

  // 获取数据
  const order = params?.order || "asc";
  const sort = params?.sort || "sort_order";
  const data = db
    .prepare(
      `SELECT * FROM grades ${whereClause} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`
    )
    .all(...queryParams, limit, offset) as Grade[];

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
export function getGradeById(id: number): Grade | null {
  const db = getDb();
  return db.prepare("SELECT * FROM grades WHERE id = ?").get(id) as Grade | null;
}

/**
 * 创建年级
 */
export function createGrade(
  input: GradeInput
): { success: boolean; message?: string; gradeId?: number } {
  const db = getDb();

  // 检查年级名称是否已存在
  const existing = db.prepare("SELECT id FROM grades WHERE name = ?").get(input.name);
  if (existing) {
    return { success: false, message: "年级名称已存在" };
  }

  // 获取最大排序号
  const maxSortOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM grades")
    .get() as { max_sort: number };
  const sortOrder = input.sort_order ?? maxSortOrder.max_sort + 1;

  // 插入年级
  const result = db
    .prepare("INSERT INTO grades (name, sort_order) VALUES (?, ?)")
    .run(input.name, sortOrder);

  return { success: true, gradeId: result.lastInsertRowid as number };
}

/**
 * 更新年级
 */
export function updateGrade(
  id: number,
  input: Partial<GradeInput>
): { success: boolean; message?: string } {
  const db = getDb();

  // 检查年级是否存在
  const existing = getGradeById(id);
  if (!existing) {
    return { success: false, message: "年级不存在" };
  }

  // 如果更新名称，检查是否重复
  if (input.name && input.name !== existing.name) {
    const duplicate = db.prepare("SELECT id FROM grades WHERE name = ? AND id != ?").get(input.name, id);
    if (duplicate) {
      return { success: false, message: "年级名称已存在" };
    }
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.sort_order !== undefined) {
    updates.push("sort_order = ?");
    values.push(input.sort_order);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  values.push(id);

  db.prepare(`UPDATE grades SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return { success: true };
}

/**
 * 删除年级
 */
export function deleteGrade(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查年级是否存在
  const existing = getGradeById(id);
  if (!existing) {
    return { success: false, message: "年级不存在" };
  }

  // 检查是否有关联的班级
  const hasClasses = db
    .prepare("SELECT COUNT(*) as count FROM classes WHERE grade_id = ?")
    .get(id) as { count: number };

  if (hasClasses.count > 0) {
    return { success: false, message: "该年级下存在班级，无法删除" };
  }

  // 删除年级
  db.prepare("DELETE FROM grades WHERE id = ?").run(id);

  return { success: true };
}

/**
 * 批量更新年级排序
 */
export function updateGradesOrder(
  updates: { id: number; sort_order: number }[]
): { success: boolean; message?: string } {
  const db = getDb();

  const updateStmt = db.prepare("UPDATE grades SET sort_order = ? WHERE id = ?");
  const updateMany = db.transaction((items: { id: number; sort_order: number }[]) => {
    for (const item of items) {
      updateStmt.run(item.sort_order, item.id);
    }
  });

  try {
    updateMany(updates);
    return { success: true };
  } catch {
    return { success: false, message: "更新排序失败" };
  }
}
