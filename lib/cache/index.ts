/**
 * 增强的内存缓存实现
 * 适用于不常变化的系统配置、学期信息等
 *
 * 功能：
 * - TTL 过期机制
 * - 缓存命中率统计
 * - 自动清理过期缓存
 * - 命名空间隔离
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number; // 命中次数
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  keys: string[];
}

/**
 * 缓存命名空间
 */
export const CacheNamespace = {
  SYSTEM_CONFIG: "system_config",
  SEMESTER: "semester",
  CLASS: "classes",
  USER: "user",
  GRADE: "grades",
  FEE_CONFIG: "fee_config",
} as const;

/**
 * TTL 预设（毫秒）
 */
export const CacheTTL = {
  SHORT: 1 * 60 * 1000,      // 1 分钟
  MEDIUM: 5 * 60 * 1000,     // 5 分钟
  LONG: 15 * 60 * 1000,      // 15 分钟
  VERY_LONG: 60 * 60 * 1000, // 1 小时
} as const;

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private hits = 0;
  private misses = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 每 5 分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    entry.hits++;
    return entry.data as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T, ttl: number = CacheTTL.MEDIUM): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }

  /**
   * 获取或设置缓存（如果不存在则执行 fetchFn）
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * 删除指定缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
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
   * 清除命名空间下的所有缓存
   */
  clearNamespace(namespace: string): void {
    this.clearPrefix(`${namespace}:`);
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 销毁缓存（清理定时器）
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export const cache = new MemoryCache();

/**
 * 带缓存的数据库查询装饰器（异步版本）
 */
export async function cached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  return cache.getOrSet(key, fetchFn, ttl);
}

/**
 * 生成缓存键
 */
export function buildCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `${namespace}:${parts.join(":")}`;
}

/**
 * 清除系统配置缓存
 */
export function clearSystemConfigCache(): void {
  cache.clearNamespace(CacheNamespace.SYSTEM_CONFIG);
}

/**
 * 清除学期缓存
 */
export function clearSemesterCache(): void {
  cache.clearNamespace(CacheNamespace.SEMESTER);
}

/**
 * 清除班级缓存
 */
export function clearClassCache(): void {
  cache.clearNamespace(CacheNamespace.CLASS);
}

/**
 * 清除用户缓存
 */
export function clearUserCache(): void {
  cache.clearNamespace(CacheNamespace.USER);
}

/**
 * 清除年级缓存
 */
export function clearGradeCache(): void {
  cache.clearNamespace(CacheNamespace.GRADE);
}

/**
 * 清除费用配置缓存
 */
export function clearFeeConfigCache(): void {
  cache.clearNamespace(CacheNamespace.FEE_CONFIG);
}

/**
 * 清除所有业务缓存
 */
export function clearAllCache(): void {
  cache.clear();
}
