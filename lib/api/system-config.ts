import { getRawPostgres } from "@/lib/db";
import type { SystemConfig } from "@/types";
import { cached, clearSystemConfigCache } from "@/lib/cache";

/**
 * 获取单个配置的字符串值
 */
export async function getConfig(key: string): Promise<string | undefined> {
  const allConfigs = await getAllConfigs();
  return allConfigs.find((c) => c.config_key === key)?.config_value;
}

/**
 * 获取所有配置（带10分钟缓存）
 */
export async function getAllConfigs(): Promise<SystemConfig[]> {
  return cached(
    "system_config:all",
    async () => {
      const pgClient = getRawPostgres();
      return await pgClient.unsafe("SELECT * FROM system_config ORDER BY config_key") as SystemConfig[];
    },
    10 * 60 * 1000 // 10分钟缓存
  );
}

/**
 * 更新单个配置
 */
export async function updateConfig(key: string, value: string): Promise<boolean> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(
    "UPDATE system_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2",
    [value, key]
  );

  // 清除缓存
  clearSystemConfigCache();

  // PostgreSQL 不提供直接的 changes 信息，需要额外查询确认
  const checkResult = await pgClient.unsafe("SELECT config_key FROM system_config WHERE config_key = $1", [key]);
  return checkResult.length > 0;
}

/**
 * 批量更新配置
 */
export async function updateConfigs(
  configs: Array<{ key: string; value: string }>
): Promise<boolean> {
  const pgClient = getRawPostgres();
  let success = true;

  for (const config of configs) {
    const result = await pgClient.unsafe(
      "UPDATE system_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2",
      [config.value, config.key]
    );
    // PostgreSQL 不提供直接的 changes 信息，需要额外查询确认
    const checkResult = await pgClient.unsafe("SELECT config_key FROM system_config WHERE config_key = $1", [config.key]);
    if (checkResult.length === 0) {
      success = false;
    }
  }

  // 清除缓存
  if (success) {
    clearSystemConfigCache();
  }

  return success;
}

/**
 * 获取数值类型配置
 */
export async function getNumberConfig(key: string, defaultValue: number): Promise<number> {
  const value = await getConfig(key);
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 获取布尔类型配置
 */
export async function getBooleanConfig(
  key: string,
  defaultValue: boolean
): Promise<boolean> {
  const value = await getConfig(key);
  if (!value) return defaultValue;
  return value === "true" || value === "1";
}

/**
 * 创建或更新配置（如果不存在则创建）
 */
export async function setConfig(
  key: string,
  value: string,
  description?: string
): Promise<void> {
  const pgClient = getRawPostgres();
  const existing = await pgClient.unsafe("SELECT id FROM system_config WHERE config_key = $1", [key]);

  if (existing.length > 0) {
    await pgClient.unsafe(
      "UPDATE system_config SET config_value = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE config_key = $3",
      [value, description || null, key]
    );
  } else {
    await pgClient.unsafe(
      "INSERT INTO system_config (config_key, config_value, description, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
      [key, value, description || null]
    );
  }
}
