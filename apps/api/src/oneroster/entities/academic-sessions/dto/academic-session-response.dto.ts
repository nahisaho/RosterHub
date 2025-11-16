import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcademicSession, StatusType, AcademicSessionType } from '@prisma/client';

export class AcademicSessionResponseDto {
  @ApiProperty({ example: 'session-abc123' })
  sourcedId: string;

  @ApiProperty()
  dateCreated: string;

  @ApiProperty()
  dateLastModified: string;

  @ApiProperty({ enum: StatusType })
  status: StatusType;

  @ApiProperty({ example: '2025 School Year' })
  title: string;

  @ApiProperty({ enum: AcademicSessionType, example: 'schoolYear' })
  type: AcademicSessionType;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty({ example: '2025' })
  schoolYear: string;

  @ApiPropertyOptional({ example: 'session-parent123' })
  parentSourcedId?: string;

  @ApiPropertyOptional({ example: { jp: {} } })
  metadata?: any;

  constructor(session: AcademicSession) {
    this.sourcedId = session.sourcedId;
    this.dateCreated = session.dateCreated.toISOString();
    this.dateLastModified = session.dateLastModified.toISOString();
    this.status = session.status;
    this.title = session.title;
    this.type = session.type;
    this.startDate = session.startDate.toISOString();
    this.endDate = session.endDate.toISOString();
    this.schoolYear = session.schoolYear;
    this.parentSourcedId = session.parentSourcedId || undefined;
    this.metadata = session.metadata || undefined;
  }
}
