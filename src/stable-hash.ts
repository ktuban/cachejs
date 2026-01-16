// src/cache/stable-hash.ts
import crypto from 'crypto';
import {stringify} from "safe-stable-stringify";
/**
 * 
Stable Hash Implementation (Critical Part)
This guarantees:
Same object → same hash
Key order doesn’t matter
Arrays preserved
Fast
 */
export function stableHash(value: unknown): string {
  const normalized = normalize(value);
  
  return crypto
    .createHash('sha1')
    .update(stringify(normalized) as string)
    .digest('hex')
    .slice(0, 16); // short but safe
}

function normalize(value: any): any {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc: any, key) => {
        acc[key] = normalize(value[key]);
        return acc;
      }, {});
  }

  return value;
}
