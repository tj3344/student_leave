import { getRawPostgres } from "@/lib/db";
import { validateOrderBy } from "@/lib/utils/sql-security";
import {
  logCreate,
  OPERATION_MODULES,
  OPERATION_ACTIONS,
} from "@/lib/constants";
import type {
  Notification,
  NotificationInput,
  NotificationCreateBatch,
  NotificationWithDetails,
  NotificationStats,
  NotificationClassTeacher,
  NotificationBatch,
  PaginationParams,
  PaginatedResponse,
} from "@/types";

/**
 * 通知服务层
 */

/**
 * 获取当前用户的通知列表（分页）
 */
export async function getNotifications(
  userId: number,
  params: PaginationParams & {
    is_read?: boolean;
    type?: string;
    sender_id?: number;
  }
): Promise<PaginatedResponse<NotificationWithDetails>> {
  const pgClient = getRawPostgres();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE n.receiver_id = $1";
  const queryParams: (string | number)[] = [userId];
  let paramIndex = 2;

  if (params.search) {
    whereClause +=
      " AND (n.title ILIKE $" +
      (paramIndex++) +
      " OR n.content ILIKE $" +
      (paramIndex++) +
      ")";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  if (params.is_read !== undefined) {
    whereClause += " AND n.is_read = $" + paramIndex++;
    queryParams.push(params.is_read);
  }

  if (params.type) {
    whereClause += " AND n.type = $" + paramIndex++;
    queryParams.push(params.type);
  }

  if (params.sender_id) {
    whereClause += " AND n.sender_id = $" + paramIndex++;
    queryParams.push(params.sender_id);
  }

  // 排序
  const { orderBy, order } = validateOrderBy(
    params.sort || "created_at",
    params.order || "desc",
    {
      allowedFields: ["n.created_at", "n.is_read", "n.title", "n.type"],
      defaultField: "n.created_at",
    }
  );
  const orderClause = `ORDER BY ${orderBy} ${order}`;

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as count
    FROM notifications n
    ${whereClause}
  `;
  const countResult = (await pgClient.unsafe(countQuery, queryParams)) as {
    count: number;
  }[];
  const total = countResult[0]?.count || 0;

  // 获取数据
  const dataQuery = `
    SELECT
      n.id, n.sender_id, n.receiver_id, n.title, n.content, n.type,
      n.is_read, n.read_at, n.created_at,
      sender.username as sender_name,
      sender.real_name as sender_real_name,
      receiver.username as receiver_name,
      receiver.real_name as receiver_real_name
    FROM notifications n
    LEFT JOIN users sender ON n.sender_id = sender.id
    LEFT JOIN users receiver ON n.receiver_id = receiver.id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const data = (await pgClient.unsafe(dataQuery, queryParams)) as NotificationWithDetails[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取管理员发送的所有通知列表（分页）
 */
export async function getSentNotifications(
  senderId: number,
  params: PaginationParams & {
    type?: string;
  }
): Promise<PaginatedResponse<NotificationWithDetails>> {
  const pgClient = getRawPostgres();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE n.sender_id = $1";
  const queryParams: (string | number)[] = [senderId];
  let paramIndex = 2;

  if (params.search) {
    whereClause +=
      " AND (n.title ILIKE $" +
      (paramIndex++) +
      " OR n.content ILIKE $" +
      (paramIndex++) +
      ")";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  if (params.type) {
    whereClause += " AND n.type = $" + paramIndex++;
    queryParams.push(params.type);
  }

  // 排序
  const { orderBy, order } = validateOrderBy(
    params.sort || "created_at",
    params.order || "desc",
    {
      allowedFields: ["n.created_at", "n.title", "n.type"],
      defaultField: "n.created_at",
    }
  );
  const orderClause = `ORDER BY ${orderBy} ${order}`;

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as count
    FROM notifications n
    ${whereClause}
  `;
  const countResult = (await pgClient.unsafe(countQuery, queryParams)) as {
    count: number;
  }[];
  const total = countResult[0]?.count || 0;

  // 获取数据
  const dataQuery = `
    SELECT
      n.id, n.sender_id, n.receiver_id, n.title, n.content, n.type,
      n.is_read, n.read_at, n.created_at,
      sender.username as sender_name,
      sender.real_name as sender_real_name,
      receiver.username as receiver_name,
      receiver.real_name as receiver_real_name
    FROM notifications n
    LEFT JOIN users sender ON n.sender_id = sender.id
    LEFT JOIN users receiver ON n.receiver_id = receiver.id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const data = (await pgClient.unsafe(dataQuery, queryParams)) as NotificationWithDetails[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 创建通知（单个）
 */
export async function createNotification(
  senderId: number,
  input: NotificationInput
): Promise<{ success: boolean; message?: string; notificationId?: number }> {
  const pgClient = getRawPostgres();

  // 验证接收者是否存在
  const receiverResult = await pgClient.unsafe(
    "SELECT id FROM users WHERE id = $1",
    [input.receiver_id]
  );
  if (receiverResult.length === 0) {
    return { success: false, message: "接收者不存在" };
  }

  const result = await pgClient.unsafe(
    `INSERT INTO notifications (sender_id, receiver_id, title, content, type, created_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING id`,
    [senderId, input.receiver_id, input.title, input.content, input.type || "announcement"]
  );

  return { success: true, notificationId: result[0]?.id };
}

/**
 * 批量创建通知（发送给多个接收者）
 */
export async function createNotificationBatch(
  senderId: number,
  input: NotificationCreateBatch
): Promise<{
  success: boolean;
  created: number;
  failed: number;
  errors: Array<{ receiver_id: number; message: string }>;
}> {
  const pgClient = getRawPostgres();
  const errors: Array<{ receiver_id: number; message: string }> = [];
  let created = 0;

  for (const receiverId of input.receiver_ids) {
    try {
      const result = await pgClient.unsafe(
        `INSERT INTO notifications (sender_id, receiver_id, title, content, type, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          senderId,
          receiverId,
          input.title,
          input.content,
          input.type || "announcement",
        ]
      );
      if (result.length > 0) {
        created++;
      } else {
        errors.push({ receiver_id: receiverId, message: "创建失败" });
      }
    } catch {
      errors.push({ receiver_id: receiverId, message: "创建失败" });
    }
  }

  return {
    success: true,
    created,
    failed: errors.length,
    errors,
  };
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(
  notificationId: number,
  userId: number
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  const result = await pgClient.unsafe(
    `UPDATE notifications
     SET is_read = true, read_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND receiver_id = $2`,
    [notificationId, userId]
  );

  if (result.count === 0) {
    return { success: false, message: "通知不存在或无权限" };
  }

  return { success: true };
}

/**
 * 批量标记通知为已读
 */
export async function markAllAsRead(
  userId: number
): Promise<{ success: boolean; count: number }> {
  const pgClient = getRawPostgres();

  const result = await pgClient.unsafe(
    `UPDATE notifications
     SET is_read = true, read_at = CURRENT_TIMESTAMP
     WHERE receiver_id = $1 AND is_read = false`,
    [userId]
  );

  return { success: true, count: result.count || 0 };
}

/**
 * 删除通知
 */
export async function deleteNotification(
  notificationId: number,
  userId: number
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  const result = await pgClient.unsafe(
    `DELETE FROM notifications WHERE id = $1 AND receiver_id = $2`,
    [notificationId, userId]
  );

  if (result.count === 0) {
    return { success: false, message: "通知不存在或无权限" };
  }

  return { success: true };
}

/**
 * 获取通知统计
 */
export async function getNotificationStats(userId: number): Promise<NotificationStats> {
  const pgClient = getRawPostgres();

  const result = (await pgClient.unsafe(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread,
      SUM(CASE WHEN type = 'system' THEN 1 ELSE 0 END) as system,
      SUM(CASE WHEN type = 'announcement' THEN 1 ELSE 0 END) as announcement,
      SUM(CASE WHEN type = 'reminder' THEN 1 ELSE 0 END) as reminder,
      SUM(CASE WHEN type = 'warning' THEN 1 ELSE 0 END) as warning
     FROM notifications WHERE receiver_id = $1`,
    [userId]
  )) as NotificationStats[];

  return {
    total: result[0]?.total || 0,
    unread: result[0]?.unread || 0,
    byType: {
      system: result[0]?.system || 0,
      announcement: result[0]?.announcement || 0,
      reminder: result[0]?.reminder || 0,
      warning: result[0]?.warning || 0,
    },
  };
}

/**
 * 获取所有班主任（用于发送通知）
 */
export async function getAllClassTeachersForNotification(): Promise<
  NotificationClassTeacher[]
> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(
    `SELECT u.id, u.real_name, u.username, c.name as class_name
     FROM users u
     LEFT JOIN classes c ON u.id = c.class_teacher_id
     WHERE u.role = 'class_teacher' AND u.is_active = true
     ORDER BY u.real_name`
  );
  return result;
}

/**
 * 获取管理员发送的聚合通知批次（分页）
 * 将批量发送给多个班主任的通知聚合为一条记录
 */
export async function getSentNotificationBatches(
  senderId: number,
  params: PaginationParams & {
    type?: string;
  }
): Promise<PaginatedResponse<NotificationBatch>> {
  const pgClient = getRawPostgres();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE n.sender_id = $1";
  const queryParams: (string | number)[] = [senderId];
  let paramIndex = 2;

  if (params.search) {
    whereClause +=
      " AND (n.title ILIKE $" +
      (paramIndex++) +
      " OR n.content ILIKE $" +
      (paramIndex++) +
      ")";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  if (params.type) {
    whereClause += " AND n.type = $" + paramIndex++;
    queryParams.push(params.type);
  }

  // 获取批次总数（按内容分组后计数）
  const countQuery = `
    SELECT COUNT(*) as count
    FROM (
      SELECT title, content, type, DATE_TRUNC('minute', created_at) as batch_time
      FROM notifications n
      ${whereClause}
      GROUP BY title, content, type, DATE_TRUNC('minute', created_at)
    ) as batches
  `;
  const countResult = (await pgClient.unsafe(countQuery, queryParams)) as {
    count: number;
  }[];
  const total = countResult[0]?.count || 0;

  // 获取批次列表
  const batchesQuery = `
    SELECT
      title,
      content,
      type,
      DATE_TRUNC('minute', created_at) as batch_time,
      MAX(created_at) as created_at,
      COUNT(*) as receiver_count,
      SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) as read_count
    FROM notifications n
    ${whereClause}
    GROUP BY title, content, type, DATE_TRUNC('minute', created_at)
    ORDER BY MAX(created_at) DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const batches = (await pgClient.unsafe(batchesQuery, queryParams)) as Array<{
    title: string;
    content: string;
    type: string;
    batch_time: Date;
    created_at: Date;
    receiver_count: number;
    read_count: number;
  }>;

  // 为每个批次获取接收者详细信息
  const result: NotificationBatch[] = [];
  for (const batch of batches) {
    // 生成批次 ID（使用内容哈希 + 时间戳）
    // batch_time 可能是 Date 对象或字符串，需要安全处理
    const batchTime = batch.batch_time instanceof Date
      ? batch.batch_time
      : new Date(batch.batch_time);
    const batchId = `${batch.title}-${batch.content}-${batch.type}-${batchTime.getTime()}`;

    // 获取该批次的所有接收者信息
    const receiversQuery = `
      SELECT
        n.receiver_id as id,
        u.real_name,
        u.username,
        c.name as class_name,
        n.is_read,
        n.read_at
      FROM notifications n
      LEFT JOIN users u ON n.receiver_id = u.id
      LEFT JOIN classes c ON u.id = c.class_teacher_id
      WHERE n.sender_id = $1
        AND n.title = $2
        AND n.content = $3
        AND n.type = $4
        AND DATE_TRUNC('minute', n.created_at) = $5
      ORDER BY n.is_read DESC, n.read_at DESC NULLS LAST, u.real_name
    `;
    const receivers = (await pgClient.unsafe(receiversQuery, [
      senderId,
      batch.title,
      batch.content,
      batch.type,
      batch.batch_time,
    ])) as Array<{
      id: number;
      real_name: string;
      username: string;
      class_name?: string;
      is_read: boolean;
      read_at?: Date;
    }>;

    result.push({
      batch_id: batchId,
      sender_id: senderId,
      title: batch.title,
      content: batch.content,
      type: batch.type as any,
      created_at: batch.created_at instanceof Date
        ? batch.created_at.toISOString()
        : new Date(batch.created_at).toISOString(),
      receiver_count: batch.receiver_count,
      read_count: batch.read_count,
      receivers: receivers.map((r) => ({
        id: r.id,
        real_name: r.real_name,
        username: r.username,
        class_name: r.class_name,
        is_read: r.is_read,
        read_at: r.read_at instanceof Date
          ? r.read_at.toISOString()
          : r.read_at
          ? new Date(r.read_at).toISOString()
          : undefined,
      })),
    });
  }

  return {
    data: result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
