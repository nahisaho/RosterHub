import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Demographic, StatusType, Sex } from '@prisma/client';

export class DemographicResponseDto {
  @ApiProperty({ example: 'demographic-abc123' })
  sourcedId: string;

  @ApiProperty()
  dateCreated: string;

  @ApiProperty()
  dateLastModified: string;

  @ApiProperty({ enum: StatusType })
  status: StatusType;

  @ApiPropertyOptional()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Sex })
  sex?: Sex;

  @ApiProperty({ example: 'user-abc123' })
  userSourcedId: string;

  @ApiPropertyOptional({ example: { jp: { nationality: 'Japan' } } })
  metadata?: any;

  constructor(demographic: Demographic) {
    this.sourcedId = demographic.sourcedId;
    this.dateCreated = demographic.dateCreated.toISOString();
    this.dateLastModified = demographic.dateLastModified.toISOString();
    this.status = demographic.status;
    this.birthDate = demographic.birthDate?.toISOString();
    this.sex = demographic.sex || undefined;
    this.userSourcedId = demographic.userSourcedId;
    this.metadata = demographic.metadata || undefined;
  }
}
