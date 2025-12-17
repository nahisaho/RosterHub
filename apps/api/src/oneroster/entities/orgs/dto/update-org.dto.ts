import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';
import { OrgType, StatusType } from '@prisma/client';

/**
 * Update Org DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant organization update request.
 */
export class UpdateOrgDto {
  @ApiPropertyOptional({ description: 'Organization name', example: 'Tokyo Central High School' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    enum: OrgType,
    description: 'Organization type',
  })
  @IsOptional()
  @IsEnum(OrgType)
  type?: OrgType;

  @ApiPropertyOptional({ description: 'Unique external identifier', example: 'school-001' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ description: 'Parent organization sourcedId', example: 'org-district456' })
  @IsOptional()
  @IsString()
  parentSourcedId?: string;

  @ApiPropertyOptional({ enum: StatusType, description: 'Record status' })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;

  @ApiPropertyOptional({
    description: 'Japan Profile metadata',
    example: { jp: { schoolCode: '13101', establishmentType: 'public' } },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      schoolCode?: string;
      establishmentType?: string;
      [key: string]: any;
    };
  };
}
