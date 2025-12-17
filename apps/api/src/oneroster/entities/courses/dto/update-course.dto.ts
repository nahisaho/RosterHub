import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsObject,
  IsArray,
} from 'class-validator';
import { StatusType } from '@prisma/client';

/**
 * Update Course DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant course update request.
 */
export class UpdateCourseDto {
  @ApiPropertyOptional({
    description: 'Course title',
    example: 'Mathematics I',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Course code', example: 'MATH101' })
  @IsOptional()
  @IsString()
  courseCode?: string;

  @ApiPropertyOptional({ enum: StatusType, description: 'Record status' })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;

  @ApiPropertyOptional({ description: 'Grade levels', type: [String] })
  @IsOptional()
  @IsArray()
  grades?: string[];

  @ApiPropertyOptional({ description: 'Subject codes', type: [String] })
  @IsOptional()
  @IsArray()
  subjectCodes?: string[];

  @ApiPropertyOptional({ description: 'Japan Profile metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      subjectArea?: string;
      credits?: number;
      [key: string]: any;
    };
  };
}
