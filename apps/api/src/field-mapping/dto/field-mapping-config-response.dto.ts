/**
 * Field Mapping Configuration Response DTO
 *
 * Response format for field mapping configurations
 */

import { ApiProperty } from '@nestjs/swagger';
import { MappingTransformationType } from './create-field-mapping-config.dto';

export class FieldMappingResponseDto {
  @ApiProperty({ description: 'Mapping ID' })
  id: string;

  @ApiProperty({ description: 'Target field name' })
  targetField: string;

  @ApiProperty({ description: 'Source field names' })
  sourceFields: string[];

  @ApiProperty({
    description: 'Transformation type',
    enum: MappingTransformationType,
  })
  transformationType: MappingTransformationType;

  @ApiProperty({ description: 'Transformation configuration', required: false })
  transformConfig?: any;

  @ApiProperty({ description: 'Is required field' })
  isRequired: boolean;

  @ApiProperty({ description: 'Default value', required: false })
  defaultValue?: string;

  @ApiProperty({ description: 'Validation rules', required: false })
  validationRules?: any;

  @ApiProperty({ description: 'Processing order' })
  order: number;

  constructor(mapping: any) {
    this.id = mapping.id;
    this.targetField = mapping.targetField;
    this.sourceFields = mapping.sourceFields;
    this.transformationType = mapping.transformationType;
    this.transformConfig = mapping.transformConfig;
    this.isRequired = mapping.isRequired;
    this.defaultValue = mapping.defaultValue;
    this.validationRules = mapping.validationRules;
    this.order = mapping.order;
  }
}

export class FieldMappingConfigResponseDto {
  @ApiProperty({ description: 'Configuration ID' })
  id: string;

  @ApiProperty({ description: 'Configuration name' })
  name: string;

  @ApiProperty({ description: 'Description', required: false })
  description?: string;

  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Is default configuration' })
  isDefault: boolean;

  @ApiProperty({ description: 'Configuration version' })
  version: number;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Field mappings',
    type: [FieldMappingResponseDto],
  })
  fieldMappings: FieldMappingResponseDto[];

  constructor(config: any) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.entityType = config.entityType;
    this.organizationId = config.organizationId;
    this.isActive = config.isActive;
    this.isDefault = config.isDefault;
    this.version = config.version;
    this.createdBy = config.createdBy;
    this.createdAt = config.createdAt;
    this.updatedAt = config.updatedAt;
    this.fieldMappings = config.fieldMappings
      ? config.fieldMappings.map((m: any) => new FieldMappingResponseDto(m))
      : [];
  }
}
