import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import Redis from 'ioredis';

/**
 * Advanced Rate Limiting Guard with True Sliding Window
 *
 * Implements precise rate limiting using Redis sorted sets and sliding window algorithm.
 * This is more accurate than fixed windows as it counts requests in the exact time window.
 *
 * Algorithm (Sliding Window with Sorted Sets):
 * 1. Store each request as a member in Redis sorted set with timestamp as score
 * 2. Remove all members with score < (now - window)
 * 3. Count remaining members
 * 4. If count < limit, add new member and allow
 * 5. If count >= limit, deny
 *
 * Advantages over Fixed Window:
 * - No burst traffic at window boundaries
 * - More accurate request counting
 * - Smoother rate limiting behavior
 *
 * Requirements Coverage:
 * - FR-AUTH-003: Rate limiting to prevent API abuse
 * - NFR-SEC-003: DoS protection with precise sliding window
 * - NFR-PERF-004: System stability under high load
 *
 * @example
 * // Apply to controller (use instead of RateLimitGuard for better accuracy)
 * @UseGuards(ApiKeyGuard, IpWhitelistGuard, RateLimitSlidingWindowGuard)
 * @Controller('api/v1/users')
 * export class UsersController {}
 */
@Injectable()
export class RateLimitSlidingWindowGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitSlidingWindowGuard.name);
  private readonly redis: Redis;

  // Default rate limit: 1000 requests per hour
  private readonly DEFAULT_RATE_LIMIT = 1000;
  private readonly DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor() {
    // Initialize Redis client
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: 'rosterhub:',
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`, error.stack);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis client connected for rate limiting');
    });
  }

  /**
   * Determines if the current request should be allowed based on rate limits
   *
   * @param context - Execution context containing request
   * @returns Promise<boolean> - true if within rate limit, throws HttpException otherwise
   * @throws HttpException with status 429 (Too Many Requests) if limit exceeded
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const apiKey = (request as any).apiKey; // Set by ApiKeyGuard

    // If no API key found (shouldn't happen if ApiKeyGuard runs first)
    if (!apiKey) {
      this.logger.error('Rate limit check failed: No API key found in request');
      throw new HttpException(
        'API key required for rate limiting',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Get rate limit for this API key (or use default)
    const rateLimit = apiKey.rateLimit || this.DEFAULT_RATE_LIMIT;
    const windowMs = this.DEFAULT_WINDOW_MS;

    // Generate Redis key for this API key
    const redisKey = this.generateRedisKey(apiKey.id);

    try {
      // Check and update rate limit using sliding window
      const result = await this.checkRateLimitSlidingWindow(
        redisKey,
        rateLimit,
        windowMs,
      );

      // Add rate limit headers to response
      this.addRateLimitHeaders(response, result);

      if (result.allowed) {
        this.logger.debug(
          `Rate limit OK for API key ${apiKey.id}: ${result.currentCount}/${rateLimit}`,
        );
        return true;
      } else {
        this.logger.warn(
          `Rate limit exceeded for API key ${apiKey.id}: ${result.currentCount}/${rateLimit}`,
        );

        // Add Retry-After header
        response.setHeader(
          'Retry-After',
          Math.ceil(result.resetTimeMs / 1000),
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded',
            error: 'Too Many Requests',
            limit: rateLimit,
            remaining: 0,
            resetAt: new Date(Date.now() + result.resetTimeMs).toISOString(),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      // If it's our rate limit exception, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      // For other errors, log and allow request (fail open for availability)
      this.logger.error(
        `Error checking rate limit for API key ${apiKey.id}: ${error.message}`,
        error.stack,
      );
      return true;
    }
  }

  /**
   * Checks rate limit using Redis sorted sets sliding window algorithm
   *
   * This is a true sliding window implementation using Redis sorted sets.
   * Each request is stored as a member with its timestamp as the score.
   *
   * Steps:
   * 1. Get current timestamp
   * 2. Calculate window start (now - windowMs)
   * 3. Remove all entries older than window start (ZREMRANGEBYSCORE)
   * 4. Count entries in current window (ZCARD)
   * 5. If under limit, add current request (ZADD) and allow
   * 6. Set expiration on the key to prevent memory leaks (EXPIRE)
   *
   * @param redisKey - Redis key for this API key's sorted set
   * @param limit - Maximum requests allowed in window
   * @param windowMs - Time window in milliseconds
   * @returns Promise<RateLimitResult> - Result with allowed status and counts
   */
  private async checkRateLimitSlidingWindow(
    redisKey: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // 1. Remove expired entries (older than window start)
    pipeline.zremrangebyscore(redisKey, '-inf', windowStart);

    // 2. Count current entries in window
    pipeline.zcard(redisKey);

    // Execute pipeline
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    // Get count from results (second command)
    const currentCount = (results[1][1] as number) || 0;

    // Check if limit exceeded
    if (currentCount >= limit) {
      // Find oldest entry to calculate reset time
      const oldestEntry = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      const oldestTimestamp = oldestEntry.length > 1
        ? parseInt(oldestEntry[1], 10)
        : now;
      const resetTimeMs = Math.max(0, oldestTimestamp + windowMs - now);

      return {
        allowed: false,
        currentCount,
        limit,
        resetTimeMs,
      };
    }

    // Add current request to sorted set
    // Use unique member name to avoid collisions (timestamp + random)
    const member = `${now}-${Math.random().toString(36).substring(7)}`;
    await this.redis.zadd(redisKey, now, member);

    // Set expiration on key (windowMs + buffer)
    // This prevents memory leaks for inactive API keys
    await this.redis.expire(redisKey, Math.ceil(windowMs / 1000) + 60);

    // Calculate reset time (time until oldest entry expires)
    const oldestEntry = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldestEntry.length > 1
      ? parseInt(oldestEntry[1], 10)
      : now;
    const resetTimeMs = Math.max(0, oldestTimestamp + windowMs - now);

    return {
      allowed: true,
      currentCount: currentCount + 1,
      limit,
      resetTimeMs,
    };
  }

  /**
   * Generates Redis key for API key's rate limit sorted set
   *
   * @param apiKeyId - API key ID
   * @returns string - Redis key
   */
  private generateRedisKey(apiKeyId: string): string {
    return `rate-limit:sliding:${apiKeyId}`;
  }

  /**
   * Adds rate limit information to response headers
   *
   * Headers added:
   * - X-RateLimit-Limit: Maximum requests in window
   * - X-RateLimit-Remaining: Requests remaining
   * - X-RateLimit-Reset: Unix timestamp when window resets
   *
   * @param response - Express response object
   * @param result - Rate limit check result
   */
  private addRateLimitHeaders(response: any, result: RateLimitResult): void {
    const remaining = Math.max(0, result.limit - result.currentCount);
    const resetAt = Math.ceil((Date.now() + result.resetTimeMs) / 1000);

    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', resetAt.toString());
  }

  /**
   * Cleanup Redis connection on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}

/**
 * Rate limit check result
 */
interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in window */
  currentCount: number;
  /** Maximum requests allowed in window */
  limit: number;
  /** Time until window resets (milliseconds) */
  resetTimeMs: number;
}
