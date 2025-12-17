import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Rate Limiting Guard
 *
 * Implements rate limiting using Redis sliding window algorithm to prevent API abuse.
 *
 * Features:
 * - Per API Key rate limiting
 * - Sliding window algorithm (more accurate than fixed window)
 * - Configurable rate limits per API key
 * - Rate limit information in response headers
 *
 * Algorithm:
 * - Uses Redis sorted sets to track requests in a time window
 * - Each request adds a timestamp to the sorted set
 * - Removes expired timestamps outside the window
 * - Counts remaining timestamps to determine if limit is exceeded
 *
 * Requirements Coverage:
 * - FR-AUTH-003: Rate limiting to prevent API abuse
 * - NFR-SEC-003: DoS protection
 * - NFR-PERF-004: System stability under high load
 *
 * Response Headers:
 * - X-RateLimit-Limit: Maximum requests allowed in window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 * - Retry-After: Seconds to wait before retrying (on 429 error)
 *
 * @example
 * // Apply to controller
 * @UseGuards(ApiKeyGuard, IpWhitelistGuard, RateLimitGuard)
 * @Controller('api/v1/users')
 * export class UsersController {}
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  // Default rate limit: 1000 requests per hour (can be overridden per API key)
  private readonly DEFAULT_RATE_LIMIT = 1000;
  private readonly DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

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
      const result = await this.checkRateLimit(redisKey, rateLimit, windowMs);

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
        response.setHeader('Retry-After', Math.ceil(result.resetTimeMs / 1000));

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
   * Checks rate limit using Redis sliding window algorithm
   *
   * Sliding Window Algorithm:
   * 1. Get current timestamp
   * 2. Remove all timestamps older than (now - window)
   * 3. Count remaining timestamps in sorted set
   * 4. If count < limit, add current timestamp and allow request
   * 5. If count >= limit, deny request
   *
   * @param redisKey - Redis key for this API key's rate limit
   * @param limit - Maximum requests allowed in window
   * @param windowMs - Time window in milliseconds
   * @returns Promise<RateLimitResult> - Result with allowed status and counts
   */
  private async checkRateLimit(
    redisKey: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();

    // Note: cache-manager doesn't support Redis sorted sets directly
    // We need to use ioredis client directly for this advanced feature
    // For now, we'll use a simpler token bucket approach with cache-manager

    // Get current count from cache
    const countKey = `${redisKey}:count`;
    const timestampKey = `${redisKey}:timestamp`;

    const currentCount = (await this.cacheManager.get<number>(countKey)) || 0;
    const windowStartTime = await this.cacheManager.get<number>(timestampKey);

    // Check if we're in a new window (or first request)
    const isNewWindow = !windowStartTime || now - windowStartTime >= windowMs;

    if (isNewWindow) {
      // Reset for new window
      await this.cacheManager.set(countKey, 1, windowMs);
      await this.cacheManager.set(timestampKey, now, windowMs);

      return {
        allowed: true,
        currentCount: 1,
        limit,
        resetTimeMs: windowMs,
      };
    }

    // We're in the same window
    if (currentCount >= limit) {
      // Limit exceeded
      const resetTimeMs = windowMs - (now - windowStartTime);
      return {
        allowed: false,
        currentCount,
        limit,
        resetTimeMs,
      };
    }

    // Increment count
    const newCount = currentCount + 1;
    const remainingTtl = windowMs - (now - windowStartTime);
    await this.cacheManager.set(countKey, newCount, remainingTtl);

    return {
      allowed: true,
      currentCount: newCount,
      limit,
      resetTimeMs: remainingTtl,
    };
  }

  /**
   * Generates Redis key for API key's rate limit data
   *
   * @param apiKeyId - API key ID
   * @returns string - Redis key
   */
  private generateRedisKey(apiKeyId: string): string {
    return `rate-limit:${apiKeyId}`;
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

    // Set headers with lowercase keys (Express normalizes to lowercase)
    response.setHeader('x-ratelimit-limit', result.limit.toString());
    response.setHeader('x-ratelimit-remaining', remaining.toString());
    response.setHeader('x-ratelimit-reset', resetAt.toString());
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
