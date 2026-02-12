/** Minimal logger contract used by this package. */
export interface LoggerContract {
  debug: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
}

export type CacheBackend = "memory" | "redis";

export interface ICacheOptions {
  // Core options for all caches
  ttl?: number;                 // Milliseconds (0 = no expiration)
  prefix?: string;              // Key namespace
  enabled?: boolean;            // Enable/disable cache
  logger?: LoggerContract | Console

  // Memory-cache specific
  maxSize?: number;             // Maximum items (undefined = default 1000)
}

export interface ICacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  backend: CacheBackend;

  // Memory-cache specific
  evictions?: number;
  maxSize?: number;
  ttl?: number;
}

export interface ICacheEntry<T> {
  value: T;
  // No expiresAt — TTL is backend-managed
  // No accessedAt — LRU handles recency internally
}