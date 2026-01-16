// src/cache/cache-key.ts
import { stableHash } from './stable-hash.js';
// Generic Cache Key Generator (Production-Ready)

export type CacheKeyParts = {
  //version?: string;
  //namespace: string;
  resource: string;
  operation: string;
  params?: unknown;
};

/**
 * Generate a deterministic, hashed cache key
 */
export function createCacheKey({
  resource,
  operation,
  params,
}: CacheKeyParts): string {
  if (!params) {
    return `${resource}:${operation}`;
  }

  const hash = stableHash(params);
  return `${resource}:${operation}:${hash}`;
}

/**
 usage:
Repository Usage (Recommended)
import { createCacheKey } from '../cache/cache-key';

const key = createCacheKey({
  namespace: 'data',
  resource: this.model.modelName,
  operation: 'list',
  params: query,
});

Example result:
v1:data:User:list:a9c2f4d8e7b1c2a3
5️⃣ CRUD Key Examples (Standardized)
// list
createCacheKey({
  namespace: 'data',
  resource: 'User',
  operation: 'list',
  params: query,
});

// by id
createCacheKey({
  namespace: 'data',
  resource: 'User',
  operation: 'id',
  params: userId,
});

// http controller (optional)
createCacheKey({
  namespace: 'http',
  resource: req.method,
  operation: req.path,
  params: req.query,
});

6️⃣ Performance Notes (Important)
SHA-1 is fast enough for cache keys (not crypto-security)
Normalization is shallow and safe for request-sized objects
16-char hash → collision risk is negligible in practice
 */