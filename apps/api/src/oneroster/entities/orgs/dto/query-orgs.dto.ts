import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgType, StatusType } from '@prisma/client';

/**
 * Query Orgs DTO
 *
 * Query parameters for GET /orgs endpoint.
 * Supports pagination, filtering, sorting, and field selection.
 */
export class QueryOrgsDto {
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
      'Filter expression (e.g., dateLastModified>=2025-01-01T00:00:00Z)',
    example: 'dateLastModified>=2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({
    description: 'Sort field and order (prefix with - for descending)',
    example: '-dateLastModified',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc or desc)',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of fields to return',
    example: 'sourcedId,name,type',
  })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization type',
    enum: OrgType,
  })
  @IsOptional()
  @IsEnum(OrgType)
  type?: OrgType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: StatusType,
  })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;
}
