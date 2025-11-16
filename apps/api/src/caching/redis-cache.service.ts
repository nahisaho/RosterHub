/**
 * Redis Cache Service
 *
 * Centralized caching service using Redis for performance optimization.
 * Provides automatic serialization, TTL management, and cache invalidation.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface CacheOptions {
  /** Time-to-live in seconds (default: 300 seconds / 5 minutes) */
  ttl?: number;
  /** Cache key prefix (default: 'cache') */
  prefix?: string;
}

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClientType;
  private isConnected = false;
  private readonly defaultTtl = 300; // 5 minutes
  private readonly defaultPrefix = 'cache';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize Redis connection on module startup
   */
  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            this.logger.error('Redis connection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting...');
    });

    try {
      await this.client.connect();
      this.logger.log('Redis cache service initialized');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      this.isConnected = false;
    }
  }

  /**
   * Cleanup Redis connection on module shutdown
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.logger.log('Redis cache service shut down');
    }
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const actualPrefix = prefix || this.defaultPrefix;
    return `${actualPrefix}:${key}`;
  }

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @param options - Cache options
   * @returns Cached value or null if not found
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, cache miss');
      return null;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const value = await this.client.get(cacheKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTtl;
      const serialized = JSON.stringify(value);

      await this.client.setEx(cacheKey, ttl, serialized);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete value from cache
   *
   * @param key - Cache key
   * @param options - Cache options
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache delete');
      return;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      await this.client.del(cacheKey);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   *
   * @param pattern - Pattern to match (e.g., "users:*")
   * @param options - Cache options
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache pattern delete');
      return;
    }

    try {
      const prefix = options?.prefix || this.defaultPrefix;
      const fullPattern = `${prefix}:${pattern}`;

      // Use SCAN to avoid blocking the server with KEYS
      const keys: string[] = [];
      for await (const key of this.client.scanIterator({ MATCH: fullPattern, COUNT: 100 })) {
        keys.push(key);
      }

      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.log(`Deleted ${keys.length} cache keys matching pattern: ${fullPattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache pattern delete error for pattern ${pattern}: ${error.message}`);
    }
  }

  /**
   * Check if key exists in cache
   *
   * @param key - Cache key
   * @param options - Cache options
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const exists = await this.client.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get time-to-live for a key
   *
   * @param key - Cache key
   * @param options - Cache options
   * @returns TTL in seconds, or -1 if key has no expiry, or -2 if key doesn't exist
   */
  async getTTL(key: string, options?: CacheOptions): Promise<number> {
    if (!this.isConnected) {
      return -2;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}: ${error.message}`);
      return -2;
    }
  }

  /**
   * Clear all cache keys with given prefix
   *
   * @param prefix - Cache prefix to clear (default: all prefixes)
   */
  async clear(prefix?: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache clear');
      return;
    }

    try {
      const pattern = prefix ? `${prefix}:*` : '*';
      await this.deletePattern(pattern);
    } catch (error) {
      this.logger.error(`Cache clear error: ${error.message}`);
    }
  }

  /**
   * Get or set cached value
   * If key exists, return cached value. Otherwise, execute callback and cache the result.
   *
   * @param key - Cache key
   * @param callback - Function to execute if cache miss
   * @param options - Cache options
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, options);

    return value;
  }

  /**
   * Increment numeric value in cache
   *
   * @param key - Cache key
   * @param amount - Amount to increment (default: 1)
   * @param options - Cache options
   * @returns New value after increment
   */
  async increment(key: string, amount: number = 1, options?: CacheOptions): Promise<number> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache increment');
      return 0;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const newValue = await this.client.incrBy(cacheKey, amount);

      // Set TTL if this is a new key
      if (newValue === amount) {
        const ttl = options?.ttl || this.defaultTtl;
        await this.client.expire(cacheKey, ttl);
      }

      return newValue;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if Redis is connected and available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }
}
