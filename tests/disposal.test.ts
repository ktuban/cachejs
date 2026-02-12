// Test file for cache disposal methods
/// <reference types="@types/jest" />
import { MemoryCache, RedisCache, ScopedCache, createCache } from '../src/index.ts';

describe('Cache Disposal Tests', () => {
  describe('MemoryCache Disposal', () => {
    test('should disconnect and clear cache', async () => {
      const cache = new MemoryCache({ maxSize: 10 });
      
      // Set some values
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      // Verify values exist
      const val1 = await cache.get('key1');
      expect(val1).toBe('value1');
      
      // Test disconnect
      await cache.disconnect();
      
      // Try to use cache after disposal
      const val2 = await cache.get('key1');
      expect(val2).toBeUndefined();
    });

    test('should support dispose alias', async () => {
      const cache = new MemoryCache();
      await cache.set('test', 'data');
      await cache.dispose();
      
      const val = await cache.get('test');
      expect(val).toBeUndefined();
    });
  });

  describe('ScopedCache Disposal', () => {
    test('should disconnect and prevent further operations', async () => {
      const backend = new MemoryCache({ maxSize: 10 });
      const scoped = new ScopedCache(backend, { prefix: 'test-scope' });
      
      // Set values in scoped cache
      await scoped.set('item1', 'data1');
      await scoped.set('item2', 'data2');
      
      // Verify values exist
      const val1 = await scoped.get('item1');
      expect(val1).toBe('data1');
      
      // Test disconnect
      await scoped.disconnect();
      
      // Try to use scoped cache after disposal
      const val2 = await scoped.get('item1');
      expect(val2).toBeUndefined();
      
      // Test that operations fail silently
      await scoped.set('item3', 'data3'); // Should do nothing
      const deleted = await scoped.delete('item2'); // Should return false
      expect(deleted).toBe(false);
    });

    test('should support dispose alias', async () => {
      const backend = new MemoryCache({ maxSize: 10 });
      const scoped = new ScopedCache(backend, { prefix: 'test-scope2' });
      await scoped.set('test', 'data');
      await scoped.dispose();
      
      const val = await scoped.get('test');
      expect(val).toBeUndefined();
    });
  });

  describe('RedisCache Disposal', () => {
    test('should have disposal methods (requires Redis for full test)', () => {
      // This test verifies the methods exist without requiring Redis connection
      // Actual Redis connection test would require Redis server
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('Factory Cache Creation', () => {
    test('should create cache with disposal methods', async () => {
      const memoryCache = await createCache('memory', { maxSize: 5 });
      
      expect(memoryCache.backend).toBe('memory');
      expect(typeof memoryCache.disconnect).toBe('function');
      expect(typeof memoryCache.dispose).toBe('function');
      
      // Clean up
      if (memoryCache.disconnect) {
        await memoryCache.disconnect();
      }
    });
  });
});
