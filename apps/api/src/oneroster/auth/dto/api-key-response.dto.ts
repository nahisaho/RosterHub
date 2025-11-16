import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for API key response
 * Returned when an API key is created or retrieved
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "key": "rh_live_1234567890abcdef...",
 *   "name": "Learning Platform A - Production",
 *   "organizationId": "org-12345",
 *   "ipWhitelist": ["192.168.1.0/24", "10.0.0.5"],
 *   "rateLimit": 1000,
 *   "isActive": true,
 *   "expiresAt": "2025-12-31T23:59:59Z",
 *   "createdAt": "2025-01-15T10:30:00Z",
 *   "lastUsedAt": null
 * }
 * ```
 */
export class ApiKeyResponseDto {
  /**
   * Unique identifier for the API key record
   *
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({
    description: 'Unique identifier for the API key record',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /**
   * The actual API key string
   * Only returned once upon creation, never shown again
   * Format: rh_live_{random_string} or rh_test_{random_string}
   *
   * @example "rh_live_1234567890abcdef1234567890abcdef"
   */
  @ApiProperty({
    description: 'The actual API key string (only shown once upon creation)',
    example: 'rh_live_1234567890abcdef1234567890abcdef',
  })
  key?: string;

  /**
   * Human-readable name for the API key
   *
   * @example "Learning Platform A - Production"
   */
  @ApiProperty({
    description: 'Human-readable name for the API key',
    example: 'Learning Platform A - Production',
  })
  name: string;

  /**
   * Organization ID that this API key belongs to
   *
   * @example "org-12345"
   */
  @ApiProperty({
    description: 'Organization ID that this API key belongs to',
    example: 'org-12345',
  })
  organizationId: string;

  /**
   * IP whitelist for this API key
   *
   * @example ["192.168.1.0/24", "10.0.0.5"]
   */
  @ApiProperty({
    description: 'IP whitelist (IPv4, IPv6, CIDR notation)',
    example: ['192.168.1.0/24', '10.0.0.5'],
  })
  ipWhitelist: string[];

  /**
   * Rate limit for this API key (requests per hour)
   *
   * @example 1000
   */
  @ApiProperty({
    description: 'Rate limit (requests per hour)',
    example: 1000,
  })
  rateLimit: number;

  /**
   * Whether the API key is active
   *
   * @example true
   */
  @ApiProperty({
    description: 'Whether the API key is active',
    example: true,
  })
  isActive: boolean;

  /**
   * Expiration date for the API key
   *
   * @example "2025-12-31T23:59:59Z"
   */
  @ApiProperty({
    description: 'Expiration date for the API key (ISO 8601 format)',
    example: '2025-12-31T23:59:59Z',
    nullable: true,
  })
  expiresAt: Date | null;

  /**
   * Creation timestamp
   *
   * @example "2025-01-15T10:30:00Z"
   */
  @ApiProperty({
    description: 'Creation timestamp (ISO 8601 format)',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  /**
   * Last used timestamp
   *
   * @example "2025-01-15T12:45:00Z"
   */
  @ApiProperty({
    description: 'Last used timestamp (ISO 8601 format)',
    example: '2025-01-15T12:45:00Z',
    nullable: true,
  })
  lastUsedAt: Date | null;

  constructor(partial: Partial<ApiKeyResponseDto>) {
    Object.assign(this, partial);
  }
}
