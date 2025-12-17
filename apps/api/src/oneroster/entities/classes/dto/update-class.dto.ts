import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';
import { ClassType, StatusType } from '@prisma/client';

/**
 * Update Class DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant class update request.
 */
export class UpdateClassDto {
  @ApiPropertyOptional({ description: 'Class title', example: 'Math 101 - Section A' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Class code', example: 'MATH101-A' })
  @IsOptional()
  @IsString()
  classCode?: string;

  @ApiPropertyOptional({ enum: ClassType, description: 'Class type' })
  @IsOptional()
  @IsEnum(ClassType)
  classType?: ClassType;

  @ApiPropertyOptional({ description: 'Location', example: 'Room 101' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: StatusType, description: 'Record status' })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;

  @ApiPropertyOptional({ description: 'Japan Profile metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      subjectCode?: string;
      gradeLevel?: string;
      [key: string]: any;
    };
  };
}
