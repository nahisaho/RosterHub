import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Org, OrgType, StatusType } from '@prisma/client';

/**
 * Org Response DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant organization response format.
 * Transforms Prisma Org entity to OneRoster JSON format.
 */
export class OrgResponseDto {
  @ApiProperty({
    description: 'OneRoster unique identifier',
    example: 'org-school123',
  })
  sourcedId: string;

  @ApiProperty({ description: 'Record creation timestamp' })
  dateCreated: string;

  @ApiProperty({ description: 'Last modification timestamp' })
  dateLastModified: string;

  @ApiProperty({ enum: StatusType, description: 'Record status' })
  status: StatusType;

  @ApiProperty({
    description: 'Organization name',
    example: 'Tokyo Central High School',
  })
  name: string;

  @ApiProperty({
    enum: OrgType,
    description: 'Organization type',
    example: 'school',
  })
  type: OrgType;

  @ApiProperty({
    description: 'Unique external identifier',
    example: 'school-001',
  })
  identifier: string;

  @ApiPropertyOptional({
    description: 'Parent organization sourcedId (for hierarchical structure)',
    example: 'org-district456',
  })
  parentSourcedId?: string;

  @ApiPropertyOptional({
    description: 'Japan Profile extensions (metadata.jp.*)',
    example: {
      jp: {
        schoolCode: '13101',
        establishmentType: 'public',
      },
    },
  })
  metadata?: {
    jp?: {
      schoolCode?: string;
      establishmentType?: string;
      [key: string]: any;
    };
  };

  constructor(org: Org) {
    this.sourcedId = org.sourcedId;
    this.dateCreated = org.dateCreated.toISOString();
    this.dateLastModified = org.dateLastModified.toISOString();
    this.status = org.status;
    this.name = org.name;
    this.type = org.type;
    this.identifier = org.identifier;
    this.parentSourcedId = org.parentSourcedId || undefined;
    this.metadata = (org.metadata as any) || undefined;
  }
}
