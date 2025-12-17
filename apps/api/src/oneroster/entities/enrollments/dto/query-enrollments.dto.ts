import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { StatusType, EnrollmentRole } from '@prisma/client';

export class QueryEnrollmentsDto {
  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderBy?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ enum: EnrollmentRole })
  @IsOptional()
  @IsEnum(EnrollmentRole)
  role?: EnrollmentRole;

  @ApiPropertyOptional({ enum: StatusType })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;
}
