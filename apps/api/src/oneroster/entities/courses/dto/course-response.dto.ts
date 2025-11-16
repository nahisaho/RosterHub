import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Course, StatusType } from '@prisma/client';

export class CourseResponseDto {
  @ApiProperty({ example: 'course-abc123' })
  sourcedId: string;

  @ApiProperty()
  dateCreated: string;

  @ApiProperty()
  dateLastModified: string;

  @ApiProperty({ enum: StatusType })
  status: StatusType;

  @ApiProperty({ example: 'Mathematics Grade 10' })
  title: string;

  @ApiProperty({ example: 'MATH10' })
  courseCode: string;

  @ApiPropertyOptional({ example: '2025' })
  schoolYear?: string;

  @ApiProperty({ example: 'org-school123' })
  schoolSourcedId: string;

  @ApiPropertyOptional({ example: { jp: { subjectCode: '02' } } })
  metadata?: any;

  constructor(course: Course) {
    this.sourcedId = course.sourcedId;
    this.dateCreated = course.dateCreated.toISOString();
    this.dateLastModified = course.dateLastModified.toISOString();
    this.status = course.status;
    this.title = course.title;
    this.courseCode = course.courseCode;
    this.schoolYear = course.schoolYear || undefined;
    this.schoolSourcedId = course.schoolSourcedId;
    this.metadata = course.metadata || undefined;
  }
}
