import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Class, StatusType, ClassType } from '@prisma/client';

/**
 * Class Response DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant class response format.
 * Transforms Prisma Class entity to OneRoster JSON format.
 */
export class ClassResponseDto {
  @ApiProperty({
    description: 'OneRoster unique identifier',
    example: 'class-abc123',
  })
  sourcedId: string;

  @ApiProperty({ description: 'Record creation timestamp' })
  dateCreated: string;

  @ApiProperty({ description: 'Last modification timestamp' })
  dateLastModified: string;

  @ApiProperty({ enum: StatusType, description: 'Record status' })
  status: StatusType;

  @ApiProperty({
    description: 'Class title',
    example: 'Mathematics Grade 10 - Period 1',
  })
  title: string;

  @ApiProperty({ description: 'Class code', example: 'MATH10-01' })
  classCode: string;

  @ApiProperty({
    enum: ClassType,
    description: 'Class type (homeroom or scheduled)',
  })
  classType: ClassType;

  @ApiPropertyOptional({
    description: 'Classroom location',
    example: 'Room 301',
  })
  location?: string;

  @ApiProperty({ description: 'Course sourcedId', example: 'course-math10' })
  courseSourcedId: string;

  @ApiProperty({
    description: 'School organization sourcedId',
    example: 'org-school123',
  })
  schoolSourcedId: string;

  @ApiPropertyOptional({
    description: 'Japan Profile extensions (metadata.jp.*)',
    example: {
      jp: {
        subjectCode: '02',
        gradeLevel: '10',
      },
    },
  })
  metadata?: {
    jp?: {
      subjectCode?: string;
      gradeLevel?: string;
      [key: string]: any;
    };
  };

  constructor(classEntity: Class) {
    this.sourcedId = classEntity.sourcedId;
    this.dateCreated = classEntity.dateCreated.toISOString();
    this.dateLastModified = classEntity.dateLastModified.toISOString();
    this.status = classEntity.status;
    this.title = classEntity.title;
    this.classCode = classEntity.classCode;
    this.classType = classEntity.classType;
    this.location = classEntity.location || undefined;
    this.courseSourcedId = classEntity.courseSourcedId;
    this.schoolSourcedId = classEntity.schoolSourcedId;
    this.metadata = (classEntity.metadata as any) || undefined;
  }
}
