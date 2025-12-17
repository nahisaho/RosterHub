import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString, IsObject } from 'class-validator';
import { AcademicSessionType, StatusType } from '@prisma/client';

/**
 * Update Academic Session DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant academic session update request.
 */
export class UpdateAcademicSessionDto {
  @ApiPropertyOptional({ description: 'Session title', example: '2025 First Semester' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: AcademicSessionType, description: 'Session type' })
  @IsOptional()
  @IsEnum(AcademicSessionType)
  type?: AcademicSessionType;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'School year', example: '2025' })
  @IsOptional()
  @IsString()
  schoolYear?: string;

  @ApiPropertyOptional({ enum: StatusType, description: 'Record status' })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;

  @ApiPropertyOptional({ description: 'Parent session sourcedId' })
  @IsOptional()
  @IsString()
  parentSourcedId?: string;

  @ApiPropertyOptional({ description: 'Japan Profile metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      fiscalYear?: number;
      schoolYearName?: string;
      termNumber?: number;
      termName?: string;
      [key: string]: any;
    };
  };
}
