"use server";

import { eq, desc, and, isNull } from "drizzle-orm";
import postgres from "postgres";
import type {
  DatabaseConnection,
  DatabaseConnectionInput,
  DatabaseConnectionWithDetails,
  DatabaseStatus,
  DatabaseConnectionTestStatus,
} from "@/types";
import { db, databaseConnections, users } from "@/lib/db";
import { encryptConnectionString, decryptConnectionString } from "@/lib/utils/crypto";

/**
 * 获取所有数据库连接
 */
export async function getConnections(): Promise<DatabaseConnectionWithDetails[]> {
  const connections = await db
    .select({
      id: databaseConnections.id,
      name: databaseConnections.name,
      connection_string_encrypted: databaseConnections.connectionStringEncrypted,
      environment: databaseConnections.environment,
      is_active: databaseConnections.isActive,
      description: databaseConnections.description,
      created_by: databaseConnections.createdBy,
      created_at: databaseConnections.createdAt,
      updated_at: databaseConnections.updatedAt,
      last_switched_at: databaseConnections.lastSwitchedAt,
      last_switched_by: databaseConnections.lastSwitchedBy,
      connection_test_status: databaseConnections.connectionTestStatus,
      connection_test_message: databaseConnections.connectionTestMessage,
      connection_test_at: databaseConnections.connectionTestAt,
      created_by_name: users.realName,
      last_switched_by_name: users.realName,
    })
    .from(databaseConnections)
    .leftJoin(users, eq(databaseConnections.createdBy, users.id))
    .orderBy(desc(databaseConnections.createdAt));

  // 获取当前活动连接 ID
  const activeConn = connections.find((c) => c.is_active);

  return connections.map((conn) => ({
    ...conn,
    is_current: conn.id === activeConn?.id,
  }));
}

/**
 * 根据 ID 获取数据库连接
 */
export async function getConnectionById(
  id: number
): Promise<DatabaseConnectionWithDetails | null> {
  const result = await db
    .select({
      id: databaseConnections.id,
      name: databaseConnections.name,
      connection_string_encrypted: databaseConnections.connectionStringEncrypted,
      environment: databaseConnections.environment,
      is_active: databaseConnections.isActive,
      description: databaseConnections.description,
      created_by: databaseConnections.createdBy,
      created_at: databaseConnections.createdAt,
      updated_at: databaseConnections.updatedAt,
      last_switched_at: databaseConnections.lastSwitchedAt,
      last_switched_by: databaseConnections.lastSwitchedBy,
      connection_test_status: databaseConnections.connectionTestStatus,
      connection_test_message: databaseConnections.connectionTestMessage,
      connection_test_at: databaseConnections.connectionTestAt,
      created_by_name: users.realName,
      last_switched_by_name: users.realName,
    })
    .from(databaseConnections)
    .leftJoin(users, eq(databaseConnections.createdBy, users.id))
    .where(eq(databaseConnections.id, id))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const conn = result[0];

  // 检查是否为当前活动连接
  const activeConn = await db
    .select({ id: databaseConnections.id })
    .from(databaseConnections)
    .where(eq(databaseConnections.isActive, true))
    .limit(1);

  return {
    ...conn,
    is_current: conn.id === activeConn[0]?.id,
  };
}

/**
 * 创建数据库连接
 */
export async function createConnection(
  input: DatabaseConnectionInput,
  userId: number
): Promise<DatabaseConnection> {
  // 加密连接字符串
  const encrypted = encryptConnectionString(input.connection_string);

  const result = await db
    .insert(databaseConnections)
    .values({
      name: input.name,
      connectionStringEncrypted: encrypted,
      environment: input.environment,
      description: input.description,
      createdBy: userId,
    })
    .returning();

  return result[0];
}

/**
 * 更新数据库连接
 */
export async function updateConnection(
  id: number,
  input: Partial<DatabaseConnectionInput>,
  userId: number
): Promise<DatabaseConnection | null> {
  const updateData: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.connection_string !== undefined) {
    updateData.connection_string_encrypted = encryptConnectionString(input.connection_string);
  }

  if (input.environment !== undefined) {
    updateData.environment = input.environment;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  const result = await db
    .update(databaseConnections)
    .set(updateData)
    .where(eq(databaseConnections.id, id))
    .returning();

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * 删除数据库连接
 */
export async function deleteConnection(id: number): Promise<boolean> {
  // 检查是否为活动连接
  const conn = await db
    .select({ is_active: databaseConnections.isActive })
    .from(databaseConnections)
    .where(eq(databaseConnections.id, id))
    .limit(1);

  if (conn.length === 0) {
    return false;
  }

  if (conn[0].is_active) {
    throw new Error("无法删除当前活动连接，请先切换到其他数据库");
  }

  const result = await db
    .delete(databaseConnections)
    .where(eq(databaseConnections.id, id))
    .returning();

  return result.length > 0;
}

/**
 * 测试数据库连接
 */
export async function testConnection(
  connectionString: string
): Promise<{
  success: boolean;
  status: DatabaseConnectionTestStatus;
  message: string;
  version?: string;
  latency?: number;
}> {
  const startTime = Date.now();

  try {
    const client = postgres(connectionString, {
      max: 1,
      connect_timeout: 10,
    });

    // 测试连接
    const result = await client.unsafe("SELECT version()");
    await client.end();

    const version = result[0]?.version || "";
    const latency = Date.now() - startTime;

    return {
      success: true,
      status: "success",
      message: "连接成功",
      version: version.split(",")[0], // 提取 PostgreSQL 版本号
      latency,
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      message: `连接失败: ${error instanceof Error ? error.message : "未知错误"}`,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * 测试已保存的数据库连接
 */
export async function testSavedConnection(
  id: number
): Promise<{
  success: boolean;
  status: DatabaseConnectionTestStatus;
  message: string;
  version?: string;
  latency?: number;
}> {
  const conn = await db
    .select({ connection_string_encrypted: databaseConnections.connectionStringEncrypted })
    .from(databaseConnections)
    .where(eq(databaseConnections.id, id))
    .limit(1);

  if (conn.length === 0) {
    return {
      success: false,
      status: "failed",
      message: "数据库连接不存在",
    };
  }

  // 解密连接字符串
  const connectionString = decryptConnectionString(conn[0].connection_string_encrypted);

  // 执行测试
  const result = await testConnection(connectionString);

  // 更新测试状态
  await db
    .update(databaseConnections)
    .set({
      connectionTestStatus: result.status,
      connectionTestMessage: result.message,
      connectionTestAt: new Date(),
    })
    .where(eq(databaseConnections.id, id));

  return result;
}

/**
 * 获取当前活动连接
 */
export async function getCurrentConnection(): Promise<DatabaseConnectionWithDetails | null> {
  const result = await db
    .select({
      id: databaseConnections.id,
      name: databaseConnections.name,
      connection_string_encrypted: databaseConnections.connectionStringEncrypted,
      environment: databaseConnections.environment,
      is_active: databaseConnections.isActive,
      description: databaseConnections.description,
      created_by: databaseConnections.createdBy,
      created_at: databaseConnections.createdAt,
      updated_at: databaseConnections.updatedAt,
      last_switched_at: databaseConnections.lastSwitchedAt,
      last_switched_by: databaseConnections.lastSwitchedBy,
      connection_test_status: databaseConnections.connectionTestStatus,
      connection_test_message: databaseConnections.connectionTestMessage,
      connection_test_at: databaseConnections.connectionTestAt,
      created_by_name: users.realName,
      last_switched_by_name: users.realName,
    })
    .from(databaseConnections)
    .leftJoin(users, eq(databaseConnections.createdBy, users.id))
    .where(eq(databaseConnections.isActive, true))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0],
    is_current: true,
  };
}

/**
 * 获取当前活动连接 ID
 */
export async function getActiveConnectionId(): Promise<number | null> {
  const result = await db
    .select({ id: databaseConnections.id })
    .from(databaseConnections)
    .where(eq(databaseConnections.isActive, true))
    .limit(1);

  return result[0]?.id || null;
}

/**
 * 获取数据库状态
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const activeConn = await getCurrentConnection();

    // 使用当前数据库连接（通过环境变量）
    const { getRawPostgres } = await import("@/lib/db");
    const client = getRawPostgres();

    // 获取数据库名称
    const dbNameResult = await client.unsafe("SELECT current_database() as name");
    const dbName = dbNameResult[0]?.name || "student_leave";

    // 获取数据库版本
    const versionResult = await client.unsafe("SELECT version()");
    const version = versionResult[0]?.version || "";

    // 获取数据库大小
    const sizeResult = await client.unsafe(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    const size = sizeResult[0]?.size || "0 B";

    // 获取表统计信息（兼容不同版本 PostgreSQL）
    const tablesResult = await client.unsafe(`
      SELECT
        schemaname || '.' || relname as name,
        COALESCE(n_live_tup, 0) as rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY rows DESC
    `);

    const tables = tablesResult.map((t: any) => ({
      name: t.name,
      rows: t.rows || 0,
    }));

    return {
      status: "connected",
      name: activeConn?.name || dbName,
      version: version.split(",")[0],
      size,
      connection_pool: {
        total: 10,
        active: 1,
        idle: 9,
      },
      tables,
    };
  } catch (error) {
    return {
      status: "disconnected",
      name: "连接失败",
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
