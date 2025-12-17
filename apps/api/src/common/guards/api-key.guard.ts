import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * API Key Authentication Guard (Production-Ready)
 *
 * Validates API key from X-API-Key header with:
 * - Database validation (via ApiKeyService)
 * - Redis caching (5-minute TTL)
 * - IP whitelist checking (delegated to IpWhitelistGuard)
 * - Rate limit tracking (delegated to RateLimitGuard)
 *
 * Used to secure all OneRoster API endpoints.
 *
 * @example
 * ```typescript
 * @Controller('ims/oneroster/v1p2/users')
 * @UseGuards(ApiKeyGuard, IpWhitelistGuard, RateLimitGuard)
 * export class UsersController {}
 * ```
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  /**
   * Cache TTL for validated API keys (5 minutes)
   */
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @Inject('API_KEY_SERVICE') private readonly apiKeyService: any, // Inject ApiKeyService
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, // Inject Redis cache
  ) {}

  /**
   * Validates API key and caches result
   *
   * @param context - Execution context
   * @returns True if authentication succeeds
   * @throws UnauthorizedException if API key is invalid or IP not whitelisted
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException(
        'API key is required. Please provide X-API-Key header.',
      );
    }

    // Check cache first (5-minute TTL)
    const cacheKey = `api-key:${apiKey}`;
    const cachedApiKeyRecord = await this.cacheManager.get(cacheKey);

    let apiKeyRecord;

    if (cachedApiKeyRecord) {
      // Use cached validation result
      apiKeyRecord = cachedApiKeyRecord;
    } else {
      // Validate API key against database
      try {
        apiKeyRecord = await (
          this.apiKeyService as { validate: (key: string) => Promise<unknown> }
        ).validate(apiKey);
      } catch {
        throw new UnauthorizedException(
          'Invalid API key or API key is inactive/expired',
        );
      }

      // Cache the validated API key record (5 minutes)
      await this.cacheManager.set(cacheKey, apiKeyRecord, this.CACHE_TTL);
    }

    // Attach API key metadata to request for logging and downstream guards
    (request as unknown as Record<string, unknown>)['apiKeyRecord'] = apiKeyRecord;
    (request as unknown as Record<string, unknown>)['apiKey'] = apiKey;
    (request as unknown as Record<string, unknown>)['clientIp'] =
      this.extractClientIp(request);
    (request as unknown as Record<string, unknown>)['organizationId'] = (
      apiKeyRecord as { organizationId: string }
    ).organizationId;

    return true;
  }

  /**
   * Extracts API key from request headers
   *
   * @param request - Express request object
   * @returns API key or undefined
   */
  private extractApiKey(request: Request): string | undefined {
    return request.headers['x-api-key'] as string | undefined;
  }

  /**
   * Extracts client IP address from request
   *
   * @param request - Express request object
   * @returns Client IP address
   */
  private extractClientIp(request: Request): string {
    // Check X-Forwarded-For header (behind proxy/load balancer)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // Fallback to direct connection IP
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
