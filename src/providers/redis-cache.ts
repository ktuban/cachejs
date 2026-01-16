import { Redis as RedisClient } from 'ioredis';
import { BaseCache ,CacheBackend, ICacheOptions} from '../index.js';
import {stringify} from "safe-stable-stringify"; 

export class RedisCache<T = any> extends BaseCache<T> {
  private redis: RedisClient;
  
  constructor(
    redisClient: RedisClient,
    options: ICacheOptions = {}
  ) {
     // Redis doesn't use maxSize, so we can ignore it or set to 0
    super("redis",{ ...options, maxSize: 0 });
    this.redis = redisClient;
  }

  async get(key: string): Promise<T | undefined> {
    if (!this.options.enabled) {
      this.incrementMiss();
      return undefined;
    }
    
    try {
      const value = await this.redis.get(this.buildKey(key));
      
      if (value === null) {
        this.incrementMiss();
        return undefined;
      }
      
      this.incrementHit();
      return JSON.parse(value) as T;
    } catch (error) {
      // On Redis error, treat as miss (fail-open)
      this.incrementMiss();
      console.error('Redis get error:', error);
      return undefined;
    }
  }
  
  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.options.enabled) return;
    
    try {
      const serialized = stringify(value) || '';
      const finalTtl = ttl ?? this.options.ttl;
      
      if (finalTtl > 0) {
        await this.redis.set(this.buildKey(key), serialized, 'PX', finalTtl);
      } else {
        await this.redis.set(this.buildKey(key), serialized);
      }
    } catch (error) {
      console.error('Redis set error:', error);
      // Fail silently - caching is best effort
    }
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(this.buildKey(key));
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }
  
  async has(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.buildKey(key));
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }
  
  // Efficient prefix clearing for Redis using SCAN
  async clearByPrefix(): Promise<void> {
    try {
      const pattern = this.buildKey(this.options.prefix) + '*';
      
      let cursor = '0';
      const batchSize = 100;
      
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          batchSize
        );
        
        cursor = nextCursor;
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        
        // Early exit if no keys found
        if (keys.length === 0 && cursor === '0') break;
        
      } while (cursor !== '0');
    } catch (error) {
      console.error('Redis clearByPrefix error:', error);
    }
  }
  
  async size(): Promise<number> {
    try {
      // Use SCAN to count keys with our prefix (more efficient than KEYS)
      let count = 0;
      let cursor = '0';
      const pattern = this.buildKey('') + '*';
      
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        
        cursor = nextCursor;
        count += keys.length;
        
        if (keys.length === 0 && cursor === '0') break;
        
      } while (cursor !== '0');
      
      return count;
    } catch (error) {
      console.error('Redis size error:', error);
      return 0;
    }
  }

  override  async getStats() {
    const baseStats = await super.getStats();
    // Redis doesn't have maxSize or evictions
    return baseStats;
  }
}


  