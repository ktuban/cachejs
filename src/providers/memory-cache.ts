import {BaseCache, ICacheOptions ,ICacheEntry, CacheBackend} from '../index.js';


export class MemoryCache<T = any> extends BaseCache<T> {
  private store = new Map<string, ICacheEntry<T>>();
  
  constructor(options: ICacheOptions = {}) {
    super("memory",options);
  }
  
  // Efficient get with expiration check
  async get(key: string): Promise<T | undefined> {
    if (!this.options.enabled) {
      this.incrementMiss();
      return undefined;
    }
    
    const fullKey = this.buildKey(key);
    const entry = this.store.get(fullKey);
    
    if (!entry) {
      this.incrementMiss();
      return undefined;
    }
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      this.incrementMiss();
      return undefined;
    }
    
    // Update access time
    entry.accessedAt = Date.now();
    this.incrementHit();
    return entry.value;
  }
  
  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.options.enabled) return;
    
    const fullKey = this.buildKey(key);
    
    // Check size limit and evict if needed
    if (this.options.maxSize > 0 && this.store.size >= this.options.maxSize) {
      this.evictOne();
    }
    
    const expiresAt = ttl ? Date.now() + ttl : undefined;
    this.store.set(fullKey, {
      value,
      expiresAt,
      accessedAt: Date.now(),
    });
  }
  
  private evictOne(): void {
    // Simple LRU eviction (good enough for most cases)
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;
    
    for (const [key, entry] of this.store) {
      if (entry.accessedAt < oldestAccess) {
        oldestAccess = entry.accessedAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }
  
  async delete(key: string): Promise<boolean> {
    return this.store.delete(this.buildKey(key));
  }
  
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const entry = this.store.get(fullKey);
    
    if (!entry) return false;
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      return false;
    }
    
    return true;
  }
  
  // Efficient prefix clearing for memory cache
  async clearByPrefix(): Promise<void> {
    const fullPrefix = this.buildKey(this.options.prefix);
    
    // Collect keys first to avoid modification during iteration
    const keysToDelete: string[] = [];
    
    for (const key of this.store.keys()) {
      if (key.startsWith(fullPrefix)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete collected keys
    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }
  
  async size(): Promise<number> {
    return this.store.size;
  }
  
  protected override onOptionsChanged(oldOptions: ICacheOptions, newOptions: ICacheOptions): void {
    // If maxSize was reduced, evict excess entries
    if (newOptions.maxSize !== undefined && 
        newOptions.maxSize < oldOptions.maxSize! && 
        this.store.size > newOptions.maxSize) {
      
      const excess = this.store.size - newOptions.maxSize;
      for (let i = 0; i < excess; i++) {
        this.evictOne();
      }
    }
  }
}