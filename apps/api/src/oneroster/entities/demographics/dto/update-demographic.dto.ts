import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsObject, IsDateString } from 'class-validator';
import { StatusType, Sex } from '@prisma/client';

/**
 * Update Demographic DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant demographic update request.
 */
export class UpdateDemographicDto {
  @ApiPropertyOptional({ description: 'Birth date', example: '2010-01-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Sex, description: 'Sex' })
  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @ApiPropertyOptional({ enum: StatusType, description: 'Record status' })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;

  @ApiPropertyOptional({
    description: 'Japan Profile metadata',
    example: { jp: { nationality: 'Japan' } },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      nationality?: string;
      [key: string]: any;
    };
  };
}
