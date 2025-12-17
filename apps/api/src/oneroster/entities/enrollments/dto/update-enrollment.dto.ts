import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
} from 'class-validator';
import { EnrollmentRole, StatusType } from '@prisma/client';

/**
 * Update Enrollment DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant enrollment update request.
 */
export class UpdateEnrollmentDto {
  @ApiPropertyOptional({ enum: EnrollmentRole, description: 'Enrollment role' })
  @IsOptional()
  @IsEnum(EnrollmentRole)
  role?: EnrollmentRole;

  @ApiPropertyOptional({ description: 'Primary enrollment flag' })
  @IsOptional()
  @IsBoolean()
  primary?: boolean;

  @ApiPropertyOptional({ description: 'Enrollment start date' })
  @IsOptional()
  @IsDateString()
  beginDate?: string;

  @ApiPropertyOptional({ description: 'Enrollment end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: StatusType, description: 'Record status' })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;

  @ApiPropertyOptional({ description: 'Japan Profile metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      primary?: boolean;
      [key: string]: any;
    };
  };
}
