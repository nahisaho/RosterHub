import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Enrollment, StatusType, EnrollmentRole } from '@prisma/client';

export class EnrollmentResponseDto {
  @ApiProperty({ example: 'enrollment-abc123' })
  sourcedId: string;

  @ApiProperty()
  dateCreated: string;

  @ApiProperty()
  dateLastModified: string;

  @ApiProperty({ enum: StatusType })
  status: StatusType;

  @ApiProperty({ enum: EnrollmentRole, example: 'student' })
  role: EnrollmentRole;

  @ApiProperty({ example: true })
  primary: boolean;

  @ApiPropertyOptional()
  beginDate?: string;

  @ApiPropertyOptional()
  endDate?: string;

  @ApiProperty({ example: 'user-abc123' })
  userSourcedId: string;

  @ApiProperty({ example: 'class-abc123' })
  classSourcedId: string;

  @ApiProperty({ example: 'org-school123' })
  schoolSourcedId: string;

  @ApiPropertyOptional({ example: { jp: {} } })
  metadata?: any;

  constructor(enrollment: Enrollment) {
    this.sourcedId = enrollment.sourcedId;
    this.dateCreated = enrollment.dateCreated.toISOString();
    this.dateLastModified = enrollment.dateLastModified.toISOString();
    this.status = enrollment.status;
    this.role = enrollment.role;
    this.primary = enrollment.primary;
    this.beginDate = enrollment.beginDate?.toISOString();
    this.endDate = enrollment.endDate?.toISOString();
    this.userSourcedId = enrollment.userSourcedId;
    this.classSourcedId = enrollment.classSourcedId;
    this.schoolSourcedId = enrollment.schoolSourcedId;
    this.metadata = enrollment.metadata || undefined;
  }
}
