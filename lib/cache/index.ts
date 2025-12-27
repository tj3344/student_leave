/**
 * 简单内存缓存实现
 * 适用于不常变化的系统配置、学期信息等
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 删除指定缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除匹配前缀的缓存
   */
  clearPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new MemoryCache();

/**
 * 带缓存的数据库查询装饰器
 */
export function cached<T>(
  key: string,
  fetchFn: () => T,
  ttl: number = 5 * 60 * 1000
): T {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = fetchFn();
  cache.set(key, data, ttl);
  return data;
}

/**
 * 清除系统配置缓存
 */
export function clearSystemConfigCache(): void {
  cache.delete("system_config:all");
  cache.clearPrefix("system_config:");
}

/**
 * 清除学期缓存
 */
export function clearSemesterCache(): void {
  cache.delete("semester:current");
  cache.delete("semester:all");
  cache.clearPrefix("semester:");
}

/**
 * 清除班级缓存
 */
export function clearClassCache(): void {
  cache.clearPrefix("classes:");
}

/**
 * 清除用户缓存
 */
export function clearUserCache(): void {
  cache.clearPrefix("user:");
}
