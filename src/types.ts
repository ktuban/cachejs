export type CacheBackend = 'memory' | 'redis';

export interface ICacheOptions {
  // Core options for all caches
  ttl?: number;          // Milliseconds (0 = no expiration)
  prefix?: string;       // For key namespacing
  enabled?: boolean;     // Enable/disable cache
  
  // Memory cache specific
  maxSize?: number;      // Maximum items (0 = unlimited, undefined = default 1000)
}

export interface ICacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  backend: CacheBackend;
  evictions?: number;    // Memory cache tracks evictions
  maxSize?: number;      // Memory cache max size
}

export interface ICacheEntry<T> {
  value: T;
  expiresAt?: number;
  accessedAt: number;
}