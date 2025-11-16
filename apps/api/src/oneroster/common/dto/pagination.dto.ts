import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * Pagination DTO
 *
 * Implements OneRoster v1.2 pagination pattern:
 * - offset: Number of records to skip
 * - limit: Maximum number of records to return
 *
 * Examples:
 * - GET /users?limit=50&offset=0 (first 50 users)
 * - GET /users?limit=100&offset=100 (users 101-200)
 *
 * Requirements Coverage:
 * - REQ-API-011~015: Pagination implementation
 *
 * @dto
 */
export class PaginationDto {
  /**
   * Maximum number of records to return
   *
   * Default: 100
   * Maximum: 1000
   */
  @ApiProperty({
    description: 'Maximum number of records to return',
    type: Number,
    required: false,
    default: 100,
    minimum: 1,
    maximum: 1000,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  /**
   * Number of records to skip
   *
   * Default: 0
   */
  @ApiProperty({
    description: 'Number of records to skip',
    type: Number,
    required: false,
    default: 0,
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

/**
 * Pagination Metadata
 *
 * Included in API responses to help clients navigate paginated results.
 */
export interface PaginationMetadata {
  /** Total number of records available */
  total: number;

  /** Current offset */
  offset: number;

  /** Current limit */
  limit: number;

  /** Whether there are more records available */
  hasMore: boolean;
}

/**
 * Paginated Response Wrapper
 *
 * Generic wrapper for paginated API responses.
 */
export class PaginatedResponse<T> {
  /**
   * Array of data items
   */
  @ApiProperty({
    description: 'Array of data items',
    isArray: true,
  })
  data: T[];

  /**
   * Pagination metadata
   */
  @ApiProperty({
    description: 'Pagination information',
    type: 'object',
    additionalProperties: true,
  })
  pagination: PaginationMetadata;

  constructor(data: T[], total: number, offset: number, limit: number) {
    this.data = data;
    this.pagination = {
      total,
      offset,
      limit,
      hasMore: offset + data.length < total,
    };
  }
}
