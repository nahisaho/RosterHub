/**
 * Create Field Mapping Configuration DTO
 *
 * Request body for creating field mapping configurations
 */

import { IsString, IsArray, IsBoolean, IsOptional, IsEnum, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum MappingTransformationType {
  DIRECT = 'direct',
  CONSTANT = 'constant',
  CONCATENATE = 'concatenate',
  SPLIT = 'split',
  LOOKUP = 'lookup',
  SCRIPT = 'script',
  DATE_FORMAT = 'dateFormat',
  TRIM = 'trim',
  LOWERCASE = 'lowercase',
  UPPERCASE = 'uppercase',
  SUBSTRING = 'substring',
  REPLACE = 'replace',
  DEFAULT = 'default',
}

export class FieldMappingRuleDto {
  @ApiProperty({
    description: 'Target field name in OneRoster entity',
    example: 'givenName',
  })
  @IsString()
  targetField: string;

  @ApiProperty({
    description: 'Source field names from CSV (can be multiple for concatenation)',
    example: ['first_name'],
  })
  @IsArray()
  @IsString({ each: true })
  sourceFields: string[];

  @ApiProperty({
    description: 'Transformation type',
    enum: MappingTransformationType,
    example: MappingTransformationType.DIRECT,
  })
  @IsEnum(MappingTransformationType)
  transformationType: MappingTransformationType;

  @ApiProperty({
    description: 'Transformation configuration (varies by transformation type)',
    example: { separator: ' ', trim: true },
    required: false,
  })
  @IsOptional()
  transformConfig?: any;

  @ApiProperty({
    description: 'Is this field required',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({
    description: 'Default value if source is empty',
    example: 'Unknown',
    required: false,
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiProperty({
    description: 'Validation rules (JSON schema)',
    required: false,
  })
  @IsOptional()
  validationRules?: any;

  @ApiProperty({
    description: 'Processing order (lower numbers processed first)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateFieldMappingConfigDto {
  @ApiProperty({
    description: 'Configuration name',
    example: 'Standard User Import',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Configuration description',
    example: 'Maps standard CSV format to OneRoster User entity',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'OneRoster entity type',
    example: 'users',
    enum: ['users', 'orgs', 'classes', 'courses', 'enrollments', 'demographics', 'academicSessions'],
  })
  @IsString()
  entityType: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org-12345',
  })
  @IsString()
  organizationId: string;

  @ApiProperty({
    description: 'Set as default mapping for this entity type',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({
    description: 'Field mapping rules',
    type: [FieldMappingRuleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingRuleDto)
  fieldMappings: FieldMappingRuleDto[];
}
