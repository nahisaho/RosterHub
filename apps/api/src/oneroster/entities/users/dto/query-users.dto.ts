import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Sort Order Enum
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Query Users DTO
 *
 * Query parameters for GET /users endpoint.
 * Supports OneRoster v1.2 query patterns:
 * - Pagination (limit, offset)
 * - Filtering (filter - OneRoster syntax)
 * - Sorting (sort, orderBy)
 * - Field selection (fields)
 */
export class QueryUsersDto {
  @ApiPropertyOptional({
    description:
      'Maximum number of records to return (default: 100, max: 1000)',
    minimum: 1,
    maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiPropertyOptional({
    description: 'Number of records to skip (default: 0)',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description:
      "OneRoster filter expression (e.g., status='active' AND role='student')",
    example: "status='active'",
  })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({
    description: 'Field name to sort by (e.g., familyName, dateLastModified)',
    example: 'familyName',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc or desc)',
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  orderBy?: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({
    description: 'Comma-separated list of fields to return',
    example: 'sourcedId,givenName,familyName,email',
  })
  @IsOptional()
  @IsString()
  fields?: string;
}
