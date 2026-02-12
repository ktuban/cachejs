import {
  ICacheProvider,
  ICacheOptions,
  ICacheStats,
  CacheBackend,
  CacheKeyParts,
  stableHash
} from './index.js';
import type { LoggerContract } from './types.js';

/**
 * BaseCache
 *
 * Abstract base class for all cache backends (MemoryCache, RedisCache).
 * Provides common option handling, stats tracking, and utility methods.
 */
export abstract class BaseCache<T = any> implements ICacheProvider<T> {
  protected options: Required<ICacheOptions>;
  protected hits = 0;
  protected misses = 0;

  readonly logger: LoggerContract | Console;
  readonly backend: CacheBackend;

  constructor(cacheBackend: CacheBackend, options: ICacheOptions = {}) {
    this.backend = cacheBackend;
    this.options = this.normalizeOptions(options);
    this.logger = this.options.logger;
  }

  private normalizeOptions(options: ICacheOptions): Required<ICacheOptions> {
    return {
      ttl: options.ttl ?? 300_000,
      maxSize: options.maxSize ?? 1000,
      prefix: options.prefix ?? '',   // default empty prefix
      enabled: options.enabled ?? true,
      logger: options.logger ?? console
    };
  }

  generateKey(parts: Partial<CacheKeyParts>): string {
    const { resource, operation, params } = parts;

    if (!params) {
      return this.buildKey(`${resource}:${operation}`);
    }

    const hash = stableHash(params);
    return this.buildKey(`${resource}:${operation}:${hash}`);
  }

  getOptions(): ICacheOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<ICacheOptions>): void {
    const oldOptions = { ...this.options };
    this.options = this.normalizeOptions({ ...this.options, ...options });
    this.onOptionsChanged?.(oldOptions, this.options);
  }

  protected incrementHit(): void {
    this.hits++;
  }

  protected incrementMiss(): void {
    this.misses++;
  }

  protected calculateHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  protected buildKey(key: string): string {
    return this.options.prefix
      ? `${this.options.prefix}:${key}`
      : key;
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.getKeys(pattern);

    for (const key of keys) {
      try {
        await this.delete(key);
      } catch (err: any) {
        this.logger.warn(
          `Failed to delete key "${key}" for pattern "${pattern}": ${err.message}`
        );
      }
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    return this.deleteByPattern(`${prefix}*`);
  }

  protected onOptionsChanged?(oldOptions: ICacheOptions, newOptions: ICacheOptions): void;

  abstract get(key: string): Promise<T | undefined>;
  abstract set(key: string, value: T, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract has(key: string): Promise<boolean>;

  abstract getKeys(pattern: string): Promise<string[]>;
  abstract clearByPrefix(): Promise<void>;
  abstract size(): Promise<number>;

  async clear(): Promise<void> {
    await this.clearByPrefix();
    this.hits = 0;
    this.misses = 0;
  }

  async getStats(): Promise<ICacheStats> {
    const size = await this.size();
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.calculateHitRate(),
      size,
      backend: this.backend
    };
  }

  async disconnect(): Promise<void> {
    await this.clear();
    this.hits = 0;
    this.misses = 0;
  }

  async dispose(): Promise<void> {
    return this.disconnect();
  }
}
