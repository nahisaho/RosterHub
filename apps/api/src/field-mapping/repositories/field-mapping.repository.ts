/**
 * Field Mapping Repository
 *
 * Data access layer for field mapping configurations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FieldMappingConfig, FieldMapping, MappingLookupTable, MappingLookupEntry, Prisma } from '@prisma/client';
import { CreateFieldMappingConfigDto } from '../dto/create-field-mapping-config.dto';

// Type for config with field mappings included
export type FieldMappingConfigWithMappings = FieldMappingConfig & {
  fieldMappings: FieldMapping[];
};

// Type for lookup table with entries included
export type MappingLookupTableWithEntries = MappingLookupTable & {
  lookupEntries: MappingLookupEntry[];
};

@Injectable()
export class FieldMappingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new field mapping configuration
   */
  async createConfig(
    createDto: CreateFieldMappingConfigDto,
    createdBy: string,
  ): Promise<FieldMappingConfig> {
    return this.prisma.fieldMappingConfig.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        entityType: createDto.entityType,
        organizationId: createDto.organizationId,
        isDefault: createDto.isDefault ?? false,
        createdBy,
        fieldMappings: {
          create: createDto.fieldMappings.map((mapping, index) => ({
            targetField: mapping.targetField,
            sourceFields: mapping.sourceFields,
            transformationType: mapping.transformationType,
            transformConfig: mapping.transformConfig,
            isRequired: mapping.isRequired ?? false,
            defaultValue: mapping.defaultValue,
            validationRules: mapping.validationRules,
            order: mapping.order ?? index,
          })),
        },
      },
      include: {
        fieldMappings: true,
      },
    });
  }

  /**
   * Find all configurations for an organization
   */
  async findByOrganization(
    organizationId: string,
    entityType?: string,
  ): Promise<FieldMappingConfigWithMappings[]> {
    return this.prisma.fieldMappingConfig.findMany({
      where: {
        organizationId,
        ...(entityType && { entityType }),
        isActive: true,
      },
      include: {
        fieldMappings: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find configuration by ID
   */
  async findById(id: string): Promise<FieldMappingConfigWithMappings | null> {
    return this.prisma.fieldMappingConfig.findUnique({
      where: { id },
      include: {
        fieldMappings: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Find default configuration for entity type
   */
  async findDefault(
    organizationId: string,
    entityType: string,
  ): Promise<FieldMappingConfigWithMappings | null> {
    return this.prisma.fieldMappingConfig.findFirst({
      where: {
        organizationId,
        entityType,
        isDefault: true,
        isActive: true,
      },
      include: {
        fieldMappings: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Update configuration
   */
  async updateConfig(
    id: string,
    updates: Partial<CreateFieldMappingConfigDto>,
  ): Promise<FieldMappingConfig> {
    // If fieldMappings are provided, delete old ones and create new ones
    if (updates.fieldMappings) {
      await this.prisma.fieldMapping.deleteMany({
        where: { configId: id },
      });
    }

    return this.prisma.fieldMappingConfig.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
        ...(updates.fieldMappings && {
          fieldMappings: {
            create: updates.fieldMappings.map((mapping, index) => ({
              targetField: mapping.targetField,
              sourceFields: mapping.sourceFields,
              transformationType: mapping.transformationType,
              transformConfig: mapping.transformConfig,
              isRequired: mapping.isRequired ?? false,
              defaultValue: mapping.defaultValue,
              validationRules: mapping.validationRules,
              order: mapping.order ?? index,
            })),
          },
        }),
      },
      include: {
        fieldMappings: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Delete configuration
   */
  async deleteConfig(id: string): Promise<FieldMappingConfig> {
    return this.prisma.fieldMappingConfig.delete({
      where: { id },
    });
  }

  /**
   * Set configuration as default (and unset others)
   */
  async setAsDefault(
    id: string,
    organizationId: string,
    entityType: string,
  ): Promise<FieldMappingConfig> {
    // Unset all other defaults for this entity type
    await this.prisma.fieldMappingConfig.updateMany({
      where: {
        organizationId,
        entityType,
        isDefault: true,
        NOT: { id },
      },
      data: {
        isDefault: false,
      },
    });

    // Set this one as default
    return this.prisma.fieldMappingConfig.update({
      where: { id },
      data: { isDefault: true },
      include: {
        fieldMappings: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Create lookup table
   */
  async createLookupTable(
    name: string,
    description: string | undefined,
    organizationId: string,
    entries: Array<{ sourceValue: string; targetValue: string; metadata?: any }>,
  ): Promise<MappingLookupTable> {
    return this.prisma.mappingLookupTable.create({
      data: {
        name,
        description,
        organizationId,
        lookupEntries: {
          create: entries.map((entry) => ({
            sourceValue: entry.sourceValue,
            targetValue: entry.targetValue,
            metadata: entry.metadata,
          })),
        },
      },
      include: {
        lookupEntries: true,
      },
    });
  }

  /**
   * Find lookup table by name
   */
  async findLookupTable(
    organizationId: string,
    name: string,
  ): Promise<MappingLookupTableWithEntries | null> {
    return this.prisma.mappingLookupTable.findFirst({
      where: {
        organizationId,
        name,
        isActive: true,
      },
      include: {
        lookupEntries: true,
      },
    });
  }

  /**
   * Get all lookup tables for an organization
   */
  async findLookupTables(organizationId: string): Promise<MappingLookupTableWithEntries[]> {
    return this.prisma.mappingLookupTable.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        lookupEntries: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete lookup table
   */
  async deleteLookupTable(id: string): Promise<MappingLookupTable> {
    return this.prisma.mappingLookupTable.delete({
      where: { id },
    });
  }
}
