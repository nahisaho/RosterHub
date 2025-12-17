import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import * as ipaddr from 'ipaddr.js';

/**
 * IP Whitelist Guard
 *
 * Validates that the incoming request originates from an IP address
 * that is in the API Key's whitelist.
 *
 * Supports:
 * - IPv4 addresses (e.g., 192.168.1.100)
 * - IPv6 addresses (e.g., 2001:db8::1)
 * - CIDR notation (e.g., 192.168.1.0/24, 2001:db8::/32)
 *
 * Requirements Coverage:
 * - FR-AUTH-002: IP whitelist validation
 * - NFR-SEC-002: IP-based access control
 *
 * @example
 * // Apply to controller
 * @UseGuards(ApiKeyGuard, IpWhitelistGuard)
 * @Controller('api/v1/users')
 * export class UsersController {}
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);

  /**
   * Determines if the current request should be allowed based on IP whitelist
   *
   * @param context - Execution context containing request
   * @returns Promise<boolean> - true if IP is whitelisted, throws UnauthorizedException otherwise
   * @throws UnauthorizedException if IP is not in whitelist or validation fails
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = (request as any).apiKey; // Set by ApiKeyGuard

    // If no API key found (shouldn't happen if ApiKeyGuard runs first)
    if (!apiKey) {
      this.logger.error(
        'IP whitelist check failed: No API key found in request',
      );
      throw new UnauthorizedException('API key required for IP validation');
    }

    // If API key has no IP whitelist, allow all IPs
    if (!apiKey.ipWhitelist || apiKey.ipWhitelist.length === 0) {
      this.logger.debug(
        `API key ${apiKey.id} has no IP whitelist - allowing all IPs`,
      );
      return true;
    }

    // Get client IP address
    const clientIp = this.extractClientIp(request);

    if (!clientIp) {
      this.logger.error('Could not extract client IP from request');
      throw new UnauthorizedException('Unable to determine client IP address');
    }

    // Validate IP against whitelist
    const isWhitelisted = this.isIpWhitelisted(
      clientIp,
      apiKey.ipWhitelist as string[],
    );

    if (!isWhitelisted) {
      this.logger.warn(
        `IP ${clientIp} not in whitelist for API key ${apiKey.id}. Whitelist: ${apiKey.ipWhitelist.join(', ')}`,
      );
      throw new UnauthorizedException(
        'Access denied: IP address not in whitelist',
      );
    }

    this.logger.debug(
      `IP ${clientIp} validated successfully for API key ${apiKey.id}`,
    );
    return true;
  }

  /**
   * Extracts the client IP address from the request
   *
   * Checks multiple sources in order of priority:
   * 1. X-Forwarded-For header (for proxy/load balancer scenarios)
   * 2. X-Real-IP header (for nginx proxy scenarios)
   * 3. Direct connection IP (request.ip)
   *
   * @param request - Express request object
   * @returns string | undefined - Client IP address or undefined if not found
   */
  private extractClientIp(request: Request): string | undefined {
    // Check X-Forwarded-For header (comma-separated list, first is original client)
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor;
      const firstIp = ips.split(',')[0].trim();
      if (firstIp) {
        this.logger.debug(`Client IP from X-Forwarded-For: ${firstIp}`);
        return firstIp;
      }
    }

    // Check X-Real-IP header (nginx proxy)
    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp) {
      const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
      this.logger.debug(`Client IP from X-Real-IP: ${ip}`);
      return ip;
    }

    // Fallback to direct connection IP
    const directIp = request.ip;
    if (directIp) {
      this.logger.debug(`Client IP from request.ip: ${directIp}`);
      return directIp;
    }

    return undefined;
  }

  /**
   * Checks if a client IP matches any entry in the whitelist
   *
   * Supports:
   * - Exact match (IPv4 or IPv6)
   * - CIDR range matching (e.g., 192.168.1.0/24)
   * - IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
   *
   * @param clientIp - Client IP address to validate
   * @param whitelist - Array of allowed IP addresses/ranges
   * @returns boolean - true if IP is whitelisted
   */
  private isIpWhitelisted(clientIp: string, whitelist: string[]): boolean {
    try {
      // Parse client IP
      const parsedClientIp = this.parseIpAddress(clientIp);
      if (!parsedClientIp) {
        this.logger.error(`Invalid client IP format: ${clientIp}`);
        return false;
      }

      // Check against each whitelist entry
      for (const whitelistEntry of whitelist) {
        try {
          // Check if whitelist entry is CIDR notation
          if (whitelistEntry.includes('/')) {
            if (this.isIpInCidrRange(parsedClientIp, whitelistEntry)) {
              this.logger.debug(
                `IP ${clientIp} matched CIDR range ${whitelistEntry}`,
              );
              return true;
            }
          } else {
            // Exact IP match
            const parsedWhitelistIp = this.parseIpAddress(whitelistEntry);
            if (
              parsedWhitelistIp &&
              this.areIpsEqual(parsedClientIp, parsedWhitelistIp)
            ) {
              this.logger.debug(
                `IP ${clientIp} matched whitelist entry ${whitelistEntry}`,
              );
              return true;
            }
          }
        } catch (error) {
          this.logger.warn(
            `Invalid whitelist entry ${whitelistEntry}: ${error.message}`,
          );
          // Continue to next whitelist entry
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error validating IP ${clientIp}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Parses an IP address string into an ipaddr.js object
   *
   * Handles:
   * - IPv4 addresses
   * - IPv6 addresses
   * - IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
   *
   * @param ip - IP address string
   * @returns IPv4 | IPv6 | null - Parsed IP address or null if invalid
   */
  private parseIpAddress(ip: string): ipaddr.IPv4 | ipaddr.IPv6 | null {
    try {
      // Remove IPv6 zone identifier if present (e.g., fe80::1%eth0)
      const cleanIp = ip.split('%')[0];

      // Parse the IP address
      const parsed = ipaddr.process(cleanIp);
      return parsed;
    } catch (error) {
      this.logger.debug(`Failed to parse IP ${ip}: ${error.message}`);
      return null;
    }
  }

  /**
   * Checks if a client IP falls within a CIDR range
   *
   * @param clientIp - Parsed client IP address
   * @param cidr - CIDR notation (e.g., 192.168.1.0/24)
   * @returns boolean - true if IP is in CIDR range
   */
  private isIpInCidrRange(
    clientIp: ipaddr.IPv4 | ipaddr.IPv6,
    cidr: string,
  ): boolean {
    try {
      const [rangeIp, prefixLengthStr] = cidr.split('/');
      const prefixLength = parseInt(prefixLengthStr, 10);

      if (isNaN(prefixLength)) {
        this.logger.warn(`Invalid CIDR prefix length: ${cidr}`);
        return false;
      }

      const parsedRangeIp = this.parseIpAddress(rangeIp);
      if (!parsedRangeIp) {
        this.logger.warn(`Invalid CIDR range IP: ${rangeIp}`);
        return false;
      }

      // Both IPs must be same kind (IPv4 or IPv6)
      if (clientIp.kind() !== parsedRangeIp.kind()) {
        return false;
      }

      // Check if client IP matches the CIDR range
      // Type assertion needed because ipaddr.js types are incomplete
      return (clientIp as any).match(parsedRangeIp, prefixLength) as boolean;
    } catch (error) {
      this.logger.warn(`Error checking CIDR range ${cidr}: ${error.message}`);
      return false;
    }
  }

  /**
   * Compares two IP addresses for equality
   *
   * Handles IPv4-mapped IPv6 addresses by converting both to comparable format
   *
   * @param ip1 - First IP address
   * @param ip2 - Second IP address
   * @returns boolean - true if IPs are equal
   */
  private areIpsEqual(
    ip1: ipaddr.IPv4 | ipaddr.IPv6,
    ip2: ipaddr.IPv4 | ipaddr.IPv6,
  ): boolean {
    // Convert both to canonical string format for comparison
    const ip1Str = ip1.toString();
    const ip2Str = ip2.toString();

    return ip1Str === ip2Str;
  }
}
