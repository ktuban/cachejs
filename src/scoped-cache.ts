import {
  ICacheProvider,
  ICacheOptions,
  ICacheStats,
  CacheBackend,
  CacheKeyParts,
  stableHash,
  LoggerContract
} from "./index.js";

/**
 * ScopedCache
 *
 * A per-service virtual cache instance that wraps a shared backend (MemoryCache or RedisCache)
 * while applying service-specific options such as prefix, TTL, enabled flag, etc.
 *
 * This prevents cross-service contamination and ensures each service has its own namespace.
 */
export class ScopedCache<T = any> implements ICacheProvider<T> {
  readonly backend: CacheBackend;
  private readonly backendInstance: ICacheProvider<T>;
  private readonly options: Required<ICacheOptions>;
  readonly logger: LoggerContract | Console;

  constructor(backendInstance: ICacheProvider<T>, options: ICacheOptions = {}) {
    this.backendInstance = backendInstance;
    this.backend = backendInstance.backend;

    const backendOpts = backendInstance.getOptions();

    this.options = {
      ttl: options.ttl ?? backendOpts.ttl!,
      prefix: options.prefix ?? "",
      maxSize: backendOpts.maxSize!,
      enabled: options.enabled ?? backendOpts.enabled!,
      logger: options.logger ?? backendOpts.logger!
    };

    this.logger = this.options.logger;
  }

  private applyPrefix(key: string): string {
    return this.options.prefix
      ? `${this.options.prefix}:${key}`
      : key;
  }

  generateKey(parts: Partial<CacheKeyParts>): string {
    const { resource, operation, params } = parts;

    if (!params) {
      return this.applyPrefix(`${resource}:${operation}`);
    }

    const hash = stableHash(params);
    return this.applyPrefix(`${resource}:${operation}:${hash}`);
  }

  async get(key: string): Promise<T | undefined> {
    if (!this.options.enabled) return undefined;
    return this.backendInstance.get(this.applyPrefix(key));
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.options.enabled) return;
    const effectiveTTL = ttl ?? this.options.ttl;
    return this.backendInstance.set(this.applyPrefix(key), value, effectiveTTL);
  }

  async delete(key: string): Promise<boolean> {
    return this.backendInstance.delete(this.applyPrefix(key));
  }

  async has(key: string): Promise<boolean> {
    return this.backendInstance.has(this.applyPrefix(key));
  }

  async getKeys(pattern: string): Promise<string[]> {
    const scopedPattern = this.applyPrefix(pattern);
    return this.backendInstance.getKeys(scopedPattern);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const scopedPattern = this.applyPrefix(pattern);
    return this.backendInstance.deleteByPattern(scopedPattern);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const scopedPrefix = this.applyPrefix(prefix);
    return this.backendInstance.deleteByPrefix(scopedPrefix);
  }

  async clear(): Promise<void> {
    return this.backendInstance.deleteByPrefix(this.options.prefix);
  }

  async clearByPrefix(): Promise<void> {
    return this.backendInstance.deleteByPrefix(this.options.prefix);
  }

  getOptions(): ICacheOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<ICacheOptions>): void {
    Object.assign(this.options, options);
  }

  async getStats(): Promise<ICacheStats> {
    return this.backendInstance.getStats();
  }

  async size(): Promise<number> {
    const keys = await this.getKeys("*");
    return keys.length;
  }

  async disconnect(): Promise<void> {
    await this.clear();
  }

  async dispose(): Promise<void> {
    return this.disconnect();
  }
}
