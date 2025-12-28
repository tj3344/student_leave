/**
 * SQL 安全工具
 * 用于防止 SQL 注入攻击，特别是 ORDER BY 子句的注入风险
 */

/**
 * 排序配置接口
 */
export interface SortConfig {
  /** 允许的排序字段白名单 */
  allowedFields: readonly string[];
  /** 默认排序字段 */
  defaultField: string;
}

/**
 * 验证并返回安全的排序参数
 *
 * @param sortParam - 用户提供的排序字段参数
 * @param orderParam - 用户提供的排序方向参数
 * @param config - 排序配置（白名单和默认值）
 * @returns 验证后的安全排序参数
 *
 * @example
 * ```ts
 * const { orderBy, order } = validateOrderBy(
 *   params.sort,
 *   params.order,
 *   { allowedFields: ["u.created_at", "u.username"], defaultField: "u.created_at" }
 * );
 * const orderClause = `ORDER BY ${orderBy} ${order}`;
 * ```
 */
export function validateOrderBy(
  sortParam: string | undefined,
  orderParam: string | undefined,
  config: SortConfig
): { orderBy: string; order: "ASC" | "DESC" } {
  const { allowedFields, defaultField } = config;

  // 白名单验证排序字段
  const orderBy = allowedFields.includes(sortParam ?? "")
    ? (sortParam ?? defaultField)
    : defaultField;

  // 白名单验证排序方向
  const allowedOrders = ["asc", "desc", "ASC", "DESC"];
  const normalizedOrder = orderParam?.toLowerCase() === "asc" ? "ASC" : "DESC";
  const order = allowedOrders.includes(orderParam ?? "")
    ? normalizedOrder
    : "DESC";

  return { orderBy, order };
}

/**
 * 各模块的排序字段白名单
 *
 * 注意：这些字段必须是表中实际存在的字段或有效的 SQL 表达式
 * 添加新字段时请确保字段名安全，避免引入 SQL 注入风险
 */
export const SORT_FIELDS = {
  /** 用户模块排序字段 */
  users: [
    "u.created_at",
    "u.username",
    "u.real_name",
    "u.role",
    "c.name",
    "g.name",
  ],

  /** 学生模块排序字段 */
  students: [
    "s.created_at",
    "s.name",
    "s.student_no",
    "c.name",
    "g.name",
  ],

  /** 请假记录模块排序字段 (注意：leave_records 表别名为 lr) */
  leaves: [
    "lr.created_at",
    "lr.start_date",
    "lr.end_date",
    "s.name",
    "lr.status",
  ],

  /** 班级模块排序字段 */
  classes: ["c.created_at", "c.name", "g.name"],

  /** 年级模块排序字段 */
  grades: ["g.created_at", "g.name"],

  /** 学期模块排序字段 */
  semesters: ["s.created_at", "s.name", "s.start_date", "s.end_date"],

  /** 教师模块排序字段 */
  teachers: ["u.created_at", "u.real_name", "c.name", "g.name"],
} as const;

/**
 * 各模块的默认排序字段
 */
export const DEFAULT_SORT_FIELDS = {
  users: "u.created_at",
  students: "s.created_at",
  leaves: "lr.created_at",
  classes: "c.created_at",
  grades: "g.created_at",
  semesters: "s.created_at",
  teachers: "u.created_at",
} as const;
