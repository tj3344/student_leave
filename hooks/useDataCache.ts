import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 缓存选项
 */
export interface CacheOptions {
  ttl?: number // 缓存过期时间（毫秒），默认 5 分钟
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * 数据缓存 Hook
 * 用于缓存 API 请求结果，减少重复请求
 *
 * @param key 缓存键
 * @param fetcher 数据获取函数
 * @param options 缓存选项
 * @returns { data, loading, error, refresh }
 *
 * @example
 * const { data, loading, refresh } = useDataCache(
 *   'students',
 *   () => fetch('/api/students').then(r => r.json()),
 *   { ttl: 60000 } // 1 分钟缓存
 * )
 */
export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000 } = options // 默认 5 分钟

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 使用 useRef 存储缓存，避免重新渲染
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())

  /**
   * 获取缓存数据
   */
  const getCached = useCallback((cacheKey: string): T | null => {
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      const now = Date.now()
      if (now - cached.timestamp < ttl) {
        return cached.data
      } else {
        // 缓存过期，删除
        cacheRef.current.delete(cacheKey)
      }
    }
    return null
  }, [ttl])

  /**
   * 设置缓存
   */
  const setCached = useCallback((cacheKey: string, value: T): void => {
    cacheRef.current.set(cacheKey, {
      data: value,
      timestamp: Date.now()
    })
  }, [])

  /**
   * 清除指定键的缓存
   */
  const clearCache = useCallback((cacheKey?: string): void => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey)
    } else {
      cacheRef.current.clear()
    }
  }, [])

  /**
   * 获取数据
   */
  const fetchData = useCallback(async (forceRefresh = false): Promise<void> => {
    // 检查缓存
    if (!forceRefresh) {
      const cached = getCached(key)
      if (cached) {
        setData(cached)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      setCached(key, result)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error')
      setError(errorObj)
      console.error(`Cache fetch error for ${key}:`, err)
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, getCached, setCached])

  /**
   * 刷新数据
   */
  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // 初始加载
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh,
    clearCache: () => clearCache(key)
  }
}

/**
 * 多键缓存 Hook
 * 用于缓存多个相关的数据请求
 *
 * @param fetchers 映射：键 -> 获取函数
 * @param options 缓存选项
 * @returns { data, loading, error, refresh }
 *
 * @example
 * const { data, loading } = useMultiDataCache({
 *   students: () => fetch('/api/students').then(r => r.json()),
 *   classes: () => fetch('/api/classes').then(r => r.json())
 * })
 */
export function useMultiDataCache<T extends Record<string, any>>(
  fetchers: {
    [K in keyof T]: () => Promise<T[K]>
  },
  options: CacheOptions = {}
) {
  const [data, setData] = useState<Partial<T>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const keys = Object.keys(fetchers) as Array<keyof T>

  const fetchAll = useCallback(async (forceRefresh = false): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const results: Partial<T> = {}

      for (const key of keys) {
        try {
          const result = await fetchers[key]()
          results[key] = result
        } catch (err) {
          console.error(`Error fetching ${String(key)}:`, err)
          // 继续获取其他数据，不中断
        }
      }

      setData(results)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error')
      setError(errorObj)
    } finally {
      setLoading(false)
    }
  }, [fetchers, keys])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const refresh = useCallback(() => {
    return fetchAll(true)
  }, [fetchAll])

  return {
    data,
    loading,
    error,
    refresh
  }
}

/**
 * 防抖搜索 Hook
 * 用于优化搜索输入，减少 API 请求
 *
 * @param initialValue 初始值
 * @param delay 延迟时间（毫秒），默认 300ms
 * @returns [value, debouncedValue, setValue]
 *
 * @example
 * const [search, debouncedSearch, setSearch] = useDebounceSearch('', 300)
 *
 * <input value={search} onChange={(e) => setSearch(e.target.value)} />
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchData(debouncedSearch)
 *   }
 * }, [debouncedSearch])
 */
export function useDebounceSearch(
  initialValue: string = '',
  delay: number = 300
): [string, string, (value: string) => void] {
  const [value, setValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return [value, debouncedValue, setValue]
}

/**
 * 本地存储缓存 Hook
 * 使用 localStorage 持久化缓存
 *
 * @param key 存储键
 * @param initialValue 初始值
 * @returns [value, setValue, removeValue]
 *
 * @example
 * const [filters, setFilters, removeFilters] = useLocalStorage('student-filters', { page: 1 })
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value: T | ((prev: T) => T)): void => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  const removeValue = (): void => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue, removeValue]
}
