import { LoggerContract } from '@ktuban/structured-logger';
import { ICacheProvider, ICacheOptions, ICacheStats, CacheBackend, CacheKeyParts, stableHash, createCacheKey } from './index.js';

export abstract class BaseCache<T = any> implements ICacheProvider<T> {
  protected options: Required<ICacheOptions>;
  protected hits = 0;
  protected misses = 0;
  readonly logger: Required<LoggerContract>
  readonly backend: CacheBackend;
  constructor(cacheBackend: CacheBackend, options: ICacheOptions = {}) {
    this.backend = cacheBackend;
    this.options = this.normalizeOptions(options);
    this.logger = options.logger || this.options.logger;
  }

  private normalizeOptions(options: ICacheOptions): Required<ICacheOptions> {
    return {
      ttl: options.ttl ?? 300_000,       // 5 minutes default
      maxSize: options.maxSize ?? 1000,  // Memory cache default
      prefix: options.prefix ?? '',      // Empty by default
      enabled: options.enabled ?? true,  // Enabled by default
      logger: options.logger || console
    };
  }

  generateKey(cachekeypart: Partial<CacheKeyParts>): string {
    const { resource,operation,params} = cachekeypart;
    if (!params) {
      return `${this.options.prefix}:${resource}:${operation}`;
    }
    const hash = stableHash(params);
    return `${this.options.prefix}:${resource}:${operation}:${hash}`;
  }

  getOptions(): ICacheOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<ICacheOptions>): void {
    const oldOptions = { ...this.options };
    this.options = { ...this.options, ...options };
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
    return `${this.options.prefix}${key}`;
  }

  // Optional hook for subclasses
  protected onOptionsChanged?(oldOptions: ICacheOptions, newOptions: ICacheOptions): void;

  // Abstract methods
  abstract get(key: string): Promise<T | undefined>;
  abstract set(key: string, value: T, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract has(key: string): Promise<boolean>;

  abstract clearByPrefix(): Promise<void>;
  abstract size(): Promise<number>;

  async clear(): Promise<void> {
    this.clearByPrefix();
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
}