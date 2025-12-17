import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ClassType, StatusType } from '@prisma/client';

/**
 * Query Classes DTO
 *
 * Query parameters for GET /classes endpoint.
 */
export class QueryClassesDto {
  @ApiPropertyOptional({
    description: 'Maximum number of records to return',
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter expression',
    example: 'dateLastModified>=2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({
    description: 'Sort field and order',
    example: '-dateLastModified',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of fields',
    example: 'sourcedId,title,classCode',
  })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  orderBy?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({
    description: 'Filter by class type',
    enum: ClassType,
  })
  @IsOptional()
  @IsEnum(ClassType)
  classType?: ClassType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: StatusType,
  })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;
}
