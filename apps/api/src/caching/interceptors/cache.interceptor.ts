/**
 * Cache Interceptor
 *
 * Automatically caches GET request responses for performance optimization.
 * Uses Redis for distributed caching with configurable TTL.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisCacheService } from '../redis-cache.service';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_PREFIX_METADATA = 'cache:prefix';

/**
 * Decorator to enable caching for a controller method
 *
 * @param ttl - Time-to-live in seconds (default: 300)
 * @param prefix - Cache key prefix (default: method path)
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @UseCache(600, 'users') // Cache for 10 minutes with 'users' prefix
 * async findOne(@Param('id') id: string) {
 *   return this.usersService.findBySourcedId(id);
 * }
 * ```
 */
export const UseCache = (ttl: number = 300, prefix?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
    if (prefix) {
      Reflect.defineMetadata(CACHE_PREFIX_METADATA, prefix, descriptor.value);
    }
    return descriptor;
  };
};

/**
 * Decorator to invalidate cache on method execution
 *
 * @param patterns - Array of cache key patterns to invalidate
 *
 * @example
 * ```typescript
 * @Post()
 * @InvalidateCache(['users:*', 'orgs:*']) // Invalidate all user and org caches
 * async create(@Body() createUserDto: CreateUserDto) {
 *   return this.usersService.create(createUserDto);
 * }
 * ```
 */
export const InvalidateCache = (...patterns: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Get cache service from the class (injected as dependency)
      const cacheService = this['cacheService'] as RedisCacheService;

      if (cacheService) {
        for (const pattern of patterns) {
          await cacheService.deletePattern(pattern);
        }
      }

      return result;
    };

    return descriptor;
  };
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Intercept HTTP requests and cache GET responses
   */
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if caching is enabled for this route
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, handler);
    if (ttl === undefined) {
      return next.handle();
    }

    const prefix = this.reflector.get<string>(CACHE_PREFIX_METADATA, handler) || 'api';

    // Build cache key from request URL and query parameters
    const cacheKey = this.buildCacheKey(request);

    // Try to get cached response
    const cachedResponse = await this.cacheService.get(cacheKey, { prefix, ttl });

    if (cachedResponse !== null) {
      this.logger.debug(`Cache hit for key: ${prefix}:${cacheKey}`);
      return of(cachedResponse);
    }

    // Cache miss - execute request and cache the response
    this.logger.debug(`Cache miss for key: ${prefix}:${cacheKey}`);

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response, { prefix, ttl });
        this.logger.debug(`Cached response for key: ${prefix}:${cacheKey}`);
      }),
    );
  }

  /**
   * Build cache key from request URL and query parameters
   */
  private buildCacheKey(request: any): string {
    const url = request.url.split('?')[0]; // Remove query string
    const queryParams = request.query;

    // Sort query parameters for consistent cache keys
    const sortedParams = Object.keys(queryParams)
      .sort()
      .map((key) => `${key}=${queryParams[key]}`)
      .join('&');

    return sortedParams ? `${url}?${sortedParams}` : url;
  }
}
