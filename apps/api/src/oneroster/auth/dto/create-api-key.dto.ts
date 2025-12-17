import {
  IsString,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new API key
 *
 * @example
 * ```json
 * {
 *   "name": "Learning Platform A - Production",
 *   "organizationId": "org-12345",
 *   "ipWhitelist": ["192.168.1.0/24", "10.0.0.5"],
 *   "rateLimit": 1000
 * }
 * ```
 */
export class CreateApiKeyDto {
  /**
   * Human-readable name for the API key
   * Used for identification and management purposes
   *
   * @example "Learning Platform A - Production"
   */
  @ApiProperty({
    description: 'Human-readable name for the API key',
    example: 'Learning Platform A - Production',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Organization ID that this API key belongs to
   * Links the API key to a specific Board of Education or institution
   *
   * @example "org-12345"
   */
  @ApiProperty({
    description: 'Organization ID that this API key belongs to',
    example: 'org-12345',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  /**
   * IP whitelist for this API key
   * Array of IP addresses or CIDR ranges allowed to use this key
   * Supports IPv4, IPv6, and CIDR notation
   *
   * @example ["192.168.1.0/24", "10.0.0.5", "2001:db8::/32"]
   */
  @ApiProperty({
    description: 'IP whitelist (IPv4, IPv6, CIDR notation)',
    example: ['192.168.1.0/24', '10.0.0.5'],
    required: false,
    default: [],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ipWhitelist?: string[];

  /**
   * Rate limit for this API key (requests per hour)
   * Default: 1000 requests/hour
   * Minimum: 100 requests/hour
   * Maximum: 10000 requests/hour
   *
   * @example 1000
   */
  @ApiProperty({
    description: 'Rate limit (requests per hour)',
    example: 1000,
    required: false,
    default: 1000,
    minimum: 100,
    maximum: 10000,
  })
  @IsInt()
  @Min(100)
  @Max(10000)
  @IsOptional()
  rateLimit?: number;

  /**
   * Expiration date for the API key (optional)
   * If not set, the key will not expire
   *
   * @example "2025-12-31T23:59:59Z"
   */
  @ApiProperty({
    description: 'Expiration date for the API key (ISO 8601 format)',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  expiresAt?: Date;
}
