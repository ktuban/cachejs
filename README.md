# @ktuban/cachejs

[![npm version](https://img.shields.io/npm/v/@ktuban/cachejs.svg)](https://www.npmjs.com/package/@ktuban/cachejs)
[![npm downloads](https://img.shields.io/npm/dm/@ktuban/cachejs.svg)](https://www.npmjs.com/package/@ktuban/cachejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support via PayPal](https://img.shields.io/badge/Support-PayPal-blue.svg)](https://paypal.me/KhalilTuban)
[![Ko‑fi](https://img.shields.io/badge/Support-Ko--fi-red.svg)](https://ko-fi.com/ktuban)

High-performance **multi-level caching system** for Node.js with Redis, memory, and hybrid strategies. Features include decorator support, scoped caches, stable hashing, and monitoring.

## ✨ Features

- **Multi-level Caching** — Memory (LRU) + Redis with automatic fallback
- **Scoped Cache Instances** — Per-service isolation with prefix-based namespacing
- **Redis Support** — Full Redis integration with pattern deletion
- **Memory Cache (LRU)** — Efficient LRU cache provider with configurable limits
- **Decorator Pattern** — TypeScript decorators for automatic method-level caching
- **Pattern Deletion** — Wildcard-based key deletion across namespaces
- **Stable Hashing** — Consistent key generation with `safe-stable-stringify`
- **Unified Interface** — Single `ICacheProvider` contract across all backends
- **Resource Management** — Proper disposal methods to prevent memory leaks
- **Production Ready** — Full TypeScript support, ESM/CJS builds, comprehensive types

---

## 📦 Installation

```bash
npm install @ktuban/cachejs
```

**Requires**: Node.js 18+

---

## 🚀 Quick Start

### Memory Cache

```typescript
import { MemoryCache } from "@ktuban/cachejs";

const cache = new MemoryCache({
  maxSize: 100,
  maxAge: 60000, // 60 seconds
});

await cache.set("user:123", { id: 123, name: "John" });
const user = await cache.get("user:123");

await cache.delete("user:123");
```

### Redis Cache

```typescript
import { RedisCache } from "@ktuban/cachejs";
import Redis from "ioredis";

const redis = new Redis();
const cache = new RedisCache(redis, {
  defaultTTL: 3600, // 1 hour
});

await cache.set("session:abc", { userId: 123 }, 1800);
const session = await cache.get("session:abc");

// Pattern-based deletion
await cache.deleteByPattern("session:*");
```

### Scoped Cache

```typescript
import { ScopedCache, MemoryCache } from "@ktuban/cachejs";

const backend = new MemoryCache();
const userCache = new ScopedCache(backend, {
  prefix: "users",
  defaultTTL: 300,
});

// Automatically prefixed as "users:profile:123"
await userCache.set("profile:123", userData);
const data = await userCache.get("profile:123");
```

---

## 📖 API Reference

### MemoryCache

Fast in-process caching using LRU eviction strategy.

```typescript
const cache = new MemoryCache({
  maxSize: 1000,           // Maximum items to store
  maxAge: 60000,           // Default TTL in milliseconds
});

// Set with optional TTL override
await cache.set(key, value, ttl);
await cache.get(key);
await cache.delete(key);
await cache.deleteByPattern("prefix:*");
await cache.flush();
```

**Options:**
- `maxSize` — Maximum number of items in cache (default: 1000)
- `maxAge` — Default TTL in milliseconds (default: 60000)

### RedisCache

Distributed caching using Redis backend.

```typescript
const cache = new RedisCache(redisClient, {
  defaultTTL: 3600,        // Default TTL in seconds
  keyPrefix: "app:",       // Global key prefix
});

await cache.set(key, value, ttl);
await cache.get(key);
await cache.delete(key);
await cache.deleteByPattern("prefix:*");
await cache.flush();
```

**Options:**
- `defaultTTL` — Default TTL in seconds (default: 3600)
- `keyPrefix` — Optional prefix for all keys

### ScopedCache

Virtual cache instance with isolated namespace and configuration.

```typescript
const scoped = new ScopedCache(backend, {
  prefix: "service-name",
  defaultTTL: 300,
  enabled: true,
});

// All keys automatically prefixed
await scoped.set("key", value);      // Stored as "service-name:key"
await scoped.get("key");
```

**Options:**
- `prefix` — Namespace prefix (required)
- `defaultTTL` — Service-specific TTL
- `enabled` — Enable/disable caching (useful for feature flags)

---

## 🔧 Resource Management & Memory Leak Prevention

Proper resource management is essential for long-running applications. All cache providers now include disposal methods to prevent memory leaks.

### Disposal Methods

```typescript
import { MemoryCache, RedisCache, ScopedCache } from "@ktuban/cachejs";

// MemoryCache disposal
const memoryCache = new MemoryCache();
await memoryCache.set("key", "value");

// Clean up resources when done
await memoryCache.disconnect();  // or await memoryCache.dispose();

// RedisCache disposal
const redisCache = new RedisCache(redisClient);
await redisCache.disconnect();  // Closes Redis connection

// ScopedCache disposal (prevents memory leaks)
const scopedCache = new ScopedCache(backend, { prefix: "service" });
await scopedCache.set("item", "data");

// Proper disposal clears namespace and prevents further operations
await scopedCache.disconnect();

// After disposal, operations fail gracefully
const value = await scopedCache.get("item"); // Returns undefined
await scopedCache.set("new", "data");        // Does nothing (logs warning)
```

### Using Explicit Resource Management

```typescript
import { ScopedCache, MemoryCache } from "@ktuban/cachejs";

{
  // Using block scope with explicit resource management
  using cache = new ScopedCache(new MemoryCache(), { prefix: "temp" });
  
  await cache.set("temp:data", "value");
  // Cache automatically disposed at end of block
} // cache.dispose() called automatically

// Or manually with try-finally
const cache = new ScopedCache(backend, { prefix: "service" });
try {
  await cache.set("data", "value");
  // ... use cache
} finally {
  await cache.dispose(); // Ensure cleanup even on errors
}
```

### Key Benefits:
1. **Memory Leak Prevention**: ScopedCache tracks disposal state
2. **Graceful Degradation**: Operations fail silently after disposal
3. **Resource Cleanup**: Redis connections properly closed
4. **Backward Compatible**: Optional methods don't break existing code

---

## 🎨 Decorator Pattern

Use decorators for automatic method-level caching:

```typescript
import { CacheDecorator } from "@ktuban/cachejs";

const cache = new MemoryCache();
const decorator = new CacheDecorator(cache);

class UserService {
  @decorator.cache({ ttl: 300 })
  async getUserById(id: string) {
    // Only called once per ID every 5 minutes
    return await db.users.findById(id);
  }
}
```

---

## 🏗️ Multi-Backend Setup

```typescript
import { MemoryCache, RedisCache, CacheRegistry } from "@ktuban/cachejs";
import Redis from "ioredis";

const redis = new Redis();
const memory = new MemoryCache({ maxSize: 500 });
const redisCache = new RedisCache(redis);

const registry = new CacheRegistry();
registry.register("memory", memory);
registry.register("redis", redisCache);

// Retrieve by name
const cache = registry.get("redis");
await cache.set("key", value);
```

---

## 🔐 Best Practices

1. **Use scoped caches** for multi-tenant applications
2. **Set appropriate TTLs** based on data freshness requirements
3. **Use pattern deletion** carefully in production
4. **Monitor memory usage** when using MemoryCache
5. **Use Redis for distributed** systems
6. **Combine strategies** — L1: Memory, L2: Redis
7. **Dispose caches properly** — Use `disconnect()` or `dispose()` methods to prevent memory leaks

---

## 🛡️ Security Notes

- Keys are serialized using `safe-stable-stringify` to prevent injection
- No sensitive data should be cached without encryption
- Configure Redis with AUTH and network isolation in production
- Use appropriate TTLs to minimize stale data exposure

---

## ☕ Support the Project

If this library helps you build faster systems, consider supporting ongoing development:

- [PayPal.me/khaliltuban](https://paypal.me/KhalilTuban)
- [Ko‑fi.com/ktuban](https://ko-fi.com/ktuban)

---

## 📄 License

MIT © K Tuban

## 🤝 Contributing

Pull requests are welcome. Please include tests and documentation updates.

## 🧭 Roadmap

- [ ] Memcached support
- [ ] Cache warming strategies
- [ ] Compression for large values
- [ ] Advanced metrics collection
