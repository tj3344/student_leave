import { getDb } from "@/lib/db";
import type { SystemConfig } from "@/types";
import { cached, clearSystemConfigCache } from "@/lib/cache";

/**
 * 获取单个配置的字符串值
 */
export function getConfig(key: string): string | undefined {
  const allConfigs = getAllConfigs();
  return allConfigs.find((c) => c.config_key === key)?.config_value;
}

/**
 * 获取所有配置（带10分钟缓存）
 */
export function getAllConfigs(): SystemConfig[] {
  return cached(
    "system_config:all",
    () => {
      const db = getDb();
      return db
        .prepare("SELECT * FROM system_config ORDER BY config_key")
        .all() as SystemConfig[];
    },
    10 * 60 * 1000 // 10分钟缓存
  );
}

/**
 * 更新单个配置
 */
export function updateConfig(key: string, value: string): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?"
    )
    .run(value, key);

  // 清除缓存
  if (result.changes > 0) {
    clearSystemConfigCache();
  }

  return result.changes > 0;
}

/**
 * 批量更新配置
 */
export function updateConfigs(
  configs: Array<{ key: string; value: string }>
): boolean {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?"
  );

  const updateMany = db.transaction((configs) => {
    let success = true;
    for (const config of configs) {
      const result = stmt.run(config.value, config.key);
      if (result.changes === 0) {
        success = false;
      }
    }
    return success;
  });

  const result = updateMany(configs);

  // 清除缓存
  if (result) {
    clearSystemConfigCache();
  }

  return result;
}

/**
 * 获取数值类型配置
 */
export function getNumberConfig(key: string, defaultValue: number): number {
  const value = getConfig(key);
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 获取布尔类型配置
 */
export function getBooleanConfig(
  key: string,
  defaultValue: boolean
): boolean {
  const value = getConfig(key);
  if (!value) return defaultValue;
  return value === "true" || value === "1";
}

/**
 * 创建或更新配置（如果不存在则创建）
 */
export function setConfig(
  key: string,
  value: string,
  description?: string
): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM system_config WHERE config_key = ?")
    .get(key);

  if (existing) {
    db.prepare(
      "UPDATE system_config SET config_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?"
    ).run(value, description || null, key);
  } else {
    db.prepare(
      "INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)"
    ).run(key, value, description || null);
  }
}
