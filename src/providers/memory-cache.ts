import { LRUCache } from "lru-cache";
import { BaseCache, ICacheOptions, ICacheEntry } from "../index.js";

export class MemoryCache<T = any> extends BaseCache<T> {
  private store: LRUCache<string, ICacheEntry<T>>;

  constructor(options: ICacheOptions = {}) {
    super("memory", options);
    this.store = this.createLRUCache();
  }

  private createLRUCache(): LRUCache<string, ICacheEntry<T>> {
    const max =
      this.options.maxSize === 0 || this.options.maxSize === undefined
        ? 1000 // default
        : this.options.maxSize;

    return new LRUCache<string, ICacheEntry<T>>({
      max,
      ttl: this.options.ttl,
      updateAgeOnGet: true,
      ttlAutopurge: true,
      allowStale: false,
      noDisposeOnSet: true,
    });
  }

  async get(key: string): Promise<T | undefined> {
    if (!this.options.enabled) {
      this.incrementMiss();
      return undefined;
    }

    const entry = this.store.get(this.buildKey(key));

    if (!entry) {
      this.incrementMiss();
      return undefined;
    }

    this.incrementHit();
    return entry.value;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.options.enabled) return;

    const entry: ICacheEntry<T> = { value };

    const fullKey = this.buildKey(key);

    if (ttl !== undefined) {
      this.store.set(fullKey, entry, { ttl });
    } else {
      this.store.set(fullKey, entry);
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(this.buildKey(key));
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(this.buildKey(key));
  }

  async getKeys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      '^' +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex chars
        .replace(/\*/g, '.*') +
      '$'
    );

    const results: string[] = [];

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        results.push(key);
      }
    }

    return results;
  }

  async clearByPrefix(): Promise<void> {
    const prefix = this.buildKey(this.options.prefix);

    const keysToDelete: string[] = [];

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) keysToDelete.push(key);
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  override async clear(): Promise<void> {
    await super.clear(); // namespace clear + stats reset
  }

  protected override onOptionsChanged(oldOptions: ICacheOptions, newOptions: ICacheOptions): void {
    if (
      newOptions.maxSize !== undefined &&
      oldOptions.maxSize !== undefined &&
      newOptions.maxSize < oldOptions.maxSize &&
      this.store.size > newOptions.maxSize
    ) {
      this.evictExcessEntries(newOptions.maxSize);
    }

    if (newOptions.ttl !== oldOptions.ttl) {
      this.logger.info(`Cache TTL changed from ${oldOptions.ttl}ms to ${newOptions.ttl}ms`);
    }

    if (newOptions.prefix !== oldOptions.prefix) {
      this.logger.info(
        `Cache prefix changed from "${oldOptions.prefix}" to "${newOptions.prefix}"`
      );
    }
  }

  private evictExcessEntries(newMaxSize: number): void {
    let toRemove = this.store.size - newMaxSize;
    if (toRemove <= 0) return;

    const keysToRemove: string[] = [];

    for (const key of this.store.keys()) {
      if (toRemove-- <= 0) break;
      keysToRemove.push(key);
    }

    for (const key of keysToRemove) {
      this.store.delete(key);
    }

    this.logger.info(`Evicted ${keysToRemove.length} entries due to maxSize reduction`);
  }

  async peek(key: string): Promise<T | undefined> {
    return this.store.peek(this.buildKey(key))?.value;
  }

  async getRemainingTTL(key: string): Promise<number | undefined> {
    const ttl = this.store.getRemainingTTL(this.buildKey(key));
    return ttl && ttl > 0 ? ttl : undefined;
  }

  override async getStats() {
    const base = await super.getStats();
    const lru = this.store as any;

    return {
      ...base,
      evictions: lru.evictedCount || 0,
      maxSize: this.options.maxSize,
      lruSize: this.store.size,
      ttl: this.options.ttl,
      calculatedSize: lru.calculatedSize || 0,
      isFull: this.store.size >= (this.options.maxSize ?? 1000),
    };
  }

  override async disconnect(): Promise<void> {
    await super.disconnect(); // Calls BaseCache.disconnect() which clears and resets stats
    this.store.clear();
  }

  override async dispose(): Promise<void> {
    return this.disconnect();
  }
}
