/**
 * 游标分页参数
 */
export interface CursorPaginationParams {
  limit?: number
  cursor?: string // 编码的游标值
  direction?: 'forward' | 'backward'
}

/**
 * 游标分页结果
 */
export interface CursorPaginationResult<T> {
  data: T[]
  nextCursor?: string
  prevCursor?: string
  hasMore: boolean
}

/**
 * 游标数据结构
 */
interface CursorData {
  value: any // 通常是 ID 或时间戳
  sortField?: string
}

/**
 * 创建游标
 * @param value 游标值（通常是 ID 或时间戳）
 * @param sortField 排序字段（可选）
 * @returns Base64URL 编码的游标字符串
 */
export function createCursor(value: any, sortField?: string): string {
  const data: CursorData = { value, sortField }
  return Buffer.from(JSON.stringify(data))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 解析游标
 * @param cursor 游标字符串
 * @returns 解析后的游标数据，无效时返回 null
 */
export function parseCursor(cursor: string): CursorData | null {
  try {
    // 添加填充并转换回标准 Base64
    const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=')
    const json = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(json) as CursorData
  } catch {
    return null
  }
}

/**
 * 构建游标分页查询的 WHERE 子句和参数
 * @param params 分页参数
 * @param orderBy 排序字段
 * @returns { sql: string, params: any[] }
 */
export function buildCursorPaginationQuery(
  params: CursorPaginationParams,
  orderBy: string = 'created_at'
): { sql: string; params: any[] } {
  const limit = Math.min(params.limit || 20, 100) // 最大限制 100
  const queryParams: any[] = []

  let whereClause = ''
  if (params.cursor) {
    const cursorData = parseCursor(params.cursor)
    if (cursorData && cursorData.value) {
      // 根据方向决定比较符
      // 默认降序（最新的在前），使用 < 表示"比游标值更旧的记录"
      const direction = params.direction === 'backward' ? '>' : '<'
      whereClause = `AND ${orderBy} ${direction} ?`
      queryParams.push(cursorData.value)
    }
  }

  const sql = `
    WHERE 1=1 ${whereClause}
    ORDER BY ${orderBy} DESC
    LIMIT ${limit + 1}
  `

  return { sql, params: queryParams }
}

/**
 * 处理游标分页结果
 * @param results 查询结果（比 limit 多 1 条）
 * @param limit 请求的 limit
 * @param orderBy 排序字段
 * @returns CursorPaginationResult
 */
export function processCursorPaginationResult<T extends Record<string, any>>(
  results: T[],
  limit: number,
  orderBy: string = 'created_at'
): CursorPaginationResult<T> {
  const hasMore = results.length > limit
  const data = hasMore ? results.slice(0, limit) : results

  // 创建游标
  const nextCursor = hasMore && data.length > 0
    ? createCursor(data[data.length - 1][orderBy], orderBy)
    : undefined

  const prevCursor = data.length > 0
    ? createCursor(data[0][orderBy], orderBy)
    : undefined

  return {
    data,
    nextCursor,
    prevCursor,
    hasMore
  }
}

/**
 * 请假记录专用游标分页
 * 针对请假记录的特定查询进行优化
 */
export interface LeaveCursorPaginationParams extends CursorPaginationParams {
  semester_id?: number
  status?: string
  student_id?: number
}

/**
 * 构建请假记录游标分页查询
 */
export function buildLeaveCursorPaginationQuery(
  params: LeaveCursorPaginationParams
): { sql: string; queryParams: any[] } {
  const limit = Math.min(params.limit || 20, 100)
  const queryParams: any[] = []

  // 基础过滤条件
  const conditions: string[] = []
  if (params.semester_id) {
    conditions.push('lr.semester_id = ?')
    queryParams.push(params.semester_id)
  }
  if (params.status) {
    conditions.push('lr.status = ?')
    queryParams.push(params.status)
  }
  if (params.student_id) {
    conditions.push('lr.student_id = ?')
    queryParams.push(params.student_id)
  }

  // 游标条件
  let cursorClause = ''
  if (params.cursor) {
    const cursorData = parseCursor(params.cursor)
    if (cursorData && cursorData.value) {
      cursorClause = 'AND lr.created_at < ?'
      queryParams.push(cursorData.value)
    }
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ') + ' ' + cursorClause
    : 'WHERE 1=1 ' + cursorClause

  const sql = `
    SELECT lr.*, s.name as student_name, s.student_no,
           c.name as class_name, u.real_name as applicant_name
    FROM leave_records lr
    LEFT JOIN students s ON lr.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON lr.applicant_id = u.id
    ${whereClause}
    ORDER BY lr.created_at DESC
    LIMIT ${limit + 1}
  `

  return { sql, queryParams }
}
