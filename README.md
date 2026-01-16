
---

# 📦 Cache System — Flexible Multi‑Backend Caching for Node.js

A lightweight, extensible caching framework supporting:

- **Memory cache (LRU + TTL)**
- **Redis cache (SCAN‑based prefix invalidation)**
- **Unified interface (`ICacheProvider`)**
- **Prefix‑based invalidation**
- **Stable key generation**
- **Hit/miss statistics**
- **Dynamic configuration**
- **Cache registry with default backend**

Perfect for API caching, filter sanitization caching, rate‑limiting, and application‑level memoization.

---

## 🚀 Features

- 🔌 **Pluggable backends** — memory or Redis  
- 🧠 **LRU eviction** for memory cache  
- ⏱️ **TTL support** for all backends  
- 🧹 **Prefix‑based invalidation**  
- 📊 **Hit/miss tracking**  
- 🧩 **Stable hashing for cache keys**  
- 🏷️ **Dynamic option updates**  
- 🧭 **Central registry for managing multiple caches**  
- 🛡️ **Safe fallback to memory if Redis is unavailable**

---

# 📚 Installation

```bash
npm install @ktuban/cachejs
```

---

# 🏗️ Architecture Overview

```
ICacheProvider
   ↑
BaseCache
   ├── MemoryCache
   └── RedisCache
CacheRegistry
```

---

# 🧩 Usage

## 1. Initialize caches at application startup

```ts
import { setupApplicationCaches } from "@ktuban/cachejs";

const cacheRegistry = await setupApplicationCaches();
```

This will:

- Use Redis if `REDIS_URL` is set  
- Otherwise fall back to memory  
- Register the default cache  
- Register a secondary memory cache if Redis is default  

---

## 2. Retrieve a cache instance

### Get default cache

```ts
const cache = cacheRegistry.getOrDefault();
```

### Get a specific backend

```ts
const redisCache = cacheRegistry.get("redis");
const memoryCache = cacheRegistry.get("memory");
```

### Get with option overrides

```ts
const cache = cacheRegistry.getOrDefault({
  name: "memory",
  options: { ttl: 60_000 }
});
```

---

## 3. Storing and retrieving values

```ts
await cache.set("user:123", { name: "K" }, 300_000);

const user = await cache.get("user:123");
```

---

## 4. Using the built‑in key generator

```ts
const key = cache.generateKey({
  resource: "/users",
  operation: "GET",
  params: { page: 1, limit: 20 }
});

await cache.set(key, data);
```

Keys are stable and collision‑resistant thanks to `stableHash`.

---

## 5. Prefix‑based invalidation

Clear all keys under a prefix:

```ts
await cache.clearByPrefix("users:");
```

Clear all caches:

```ts
await cacheRegistry.clearAll();
```

---

# 🔐 Example: Using Cache with secureFilter

```ts
import { secureFilter } from "./middleware/secureFilter";
import { CacheRegistry } from "@ktuban/cachejs";

const cache = CacheRegistry.getInstance().getOrDefault();

router.get(
  "/users",
  secureFilter("high", cache),
  controller.toList
);
```

### secureFilter will:

- Generate a stable cache key from:
  - `req.method`
  - `req.path`
  - `req.query`
  - `securityLevel`
- Check cache first  
- If cached → skip sanitization  
- If not cached → sanitize filter, cache result  
- Replace `req.query` with sanitized version  

This dramatically improves performance for repeated queries.

---

# 📊 Getting Cache Stats

```ts
const stats = await cacheRegistry.getStats();
console.log(stats);
```

Example output:

```json
{
  "memory": {
    "hits": 120,
    "misses": 30,
    "hitRate": 0.8,
    "size": 450,
    "backend": "memory"
  },
  "redis": {
    "hits": 300,
    "misses": 50,
    "hitRate": 0.857,
    "size": 1200,
    "backend": "redis"
  }
}
```

---

# ⚙️ Configuration Options

```ts
interface ICacheOptions {
  ttl?: number;       // default: 300_000 (5 minutes)
  maxSize?: number;   // memory cache only
  prefix?: string;    // namespace prefix
  enabled?: boolean;  // enable/disable caching
}
```

---

# 🧪 Testing Support

Reset registry:

```ts
CacheRegistry.reset();
```

Inject custom caches for testing:

```ts
await cacheRegistry.register("memory", new MemoryCache(), true);
```

---

# 🧱 Backends

## MemoryCache

- LRU eviction  
- TTL support  
- Fast prefix clearing  
- Great for local development or small deployments  

## RedisCache

- Distributed caching  
- SCAN‑based prefix clearing  
- TTL support  
- Safe fallback to memory if Redis unavailable  

---

# 🧭 Best Practices

- Use **prefixes** to group cache entries by route or feature  
- Use **stableHash** for complex params  
- Use **Redis** in production for multi‑instance deployments  
- Use **MemoryCache** for hot L1 caching  
- Use **cacheRegistry.getOrDefault()** for dependency injection  
- Use **secureFilter caching** for expensive sanitization operations  

---

# 🏁 Final Notes

This caching system is designed to be:

- Fast  
- Flexible  
- Extensible  
- Safe  
- Easy to integrate  

It works beautifully with:

- API response caching  
- MongoDB filter sanitization  
- Rate limiting  
- Request deduplication  
- Background job memoization  

