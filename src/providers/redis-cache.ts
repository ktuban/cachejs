import { Redis as RedisClient } from 'ioredis';
import { BaseCache, ICacheOptions } from '../index.js';
import { stringify } from 'safe-stable-stringify';

export class RedisCache<T = any> extends BaseCache<T> {
  private redis: RedisClient;

  constructor(redisClient: RedisClient, options: ICacheOptions = {}) {
    super("redis", { ...options, maxSize: 0 });
    this.redis = redisClient;
  }

  async get(key: string): Promise<T | undefined> {
    if (!this.options.enabled) {
      this.incrementMiss();
      return undefined;
    }

    try {
      const raw = await this.redis.get(this.buildKey(key));

      if (raw === null) {
        this.incrementMiss();
        return undefined;
      }

      try {
        const parsed = JSON.parse(raw) as T;
        this.incrementHit();
        return parsed;
      } catch (err:any) {
        this.incrementMiss();
        this.logger.error(`Redis parse error for key ${key}`, {err});
        return undefined;
      }

    } catch (err) {
      this.incrementMiss();
      this.logger.error(`Redis get error for key ${key}`, {err});
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
    } catch (err) {
      this.logger.error(`Redis set error for key ${key}`, {err});
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
  const redisPattern = this.buildKey('') + pattern.replace(/^\*/, '');
  const keys: string[] = [];
  let cursor = '0';

  try {
    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        redisPattern,
        'COUNT',
        100
      );

      cursor = nextCursor;

      for (const key of batch) {
        keys.push(key);
      }

    } while (cursor !== '0');

    return keys;

  } catch (err) {
    this.logger.error('Redis getKeys error', {err});
    return [];
  }
}

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(this.buildKey(key));
      return result > 0;
    } catch (err) {
      this.logger.error(`Redis delete error for key ${key}`, {err});
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.buildKey(key));
      return result === 1;
    } catch (err) {
      this.logger.error(`Redis exists error for key ${key}`, {err});
      return false;
    }
  }

  async clearByPrefix(): Promise<void> {
    try {
      const pattern = this.buildKey('') + '*';
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

      } while (cursor !== '0');

    } catch (err) {
      this.logger.error('Redis clearByPrefix error', {err});
    }
  }

  async size(): Promise<number> {
    try {
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

      } while (cursor !== '0');

      return count;

    } catch (err) {
      this.logger.error('Redis size error', {err});
      return 0;
    }
  }

  override async getStats() {
    const base = await super.getStats();
    return {
      ...base,
      ttl: this.options.ttl
    };
  }

  override async disconnect(): Promise<void> {
    await super.disconnect(); // Clear namespace and reset stats
    
    // Close Redis connection if it's still open
    if (this.redis && this.redis.status !== 'end' && this.redis.status !== 'close') {
      try {
        await this.redis.quit();
      } catch (err) {
        this.logger.warn?.('Error closing Redis connection', { error: err });
        // Try force disconnect if quit fails
        this.redis.disconnect();
      }
    }
  }

  override async dispose(): Promise<void> {
    return this.disconnect();
  }
}
