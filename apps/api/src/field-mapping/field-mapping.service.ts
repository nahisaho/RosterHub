/**
 * Field Mapping Service
 *
 * Business logic for field mapping configuration management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FieldMappingRepository } from './repositories/field-mapping.repository';
import {
  TransformationEngineService,
  TransformationContext,
} from './transformations/transformation-engine.service';
import { CreateFieldMappingConfigDto } from './dto/create-field-mapping-config.dto';
import { FieldMappingConfigResponseDto } from './dto/field-mapping-config-response.dto';

@Injectable()
export class FieldMappingService {
  private readonly logger = new Logger(FieldMappingService.name);

  constructor(
    private readonly repository: FieldMappingRepository,
    private readonly transformationEngine: TransformationEngineService,
  ) {}

  /**
   * Create a new field mapping configuration
   */
  async createConfig(
    createDto: CreateFieldMappingConfigDto,
    createdBy: string,
  ): Promise<FieldMappingConfigResponseDto> {
    this.logger.log(`Creating field mapping config: ${createDto.name}`);

    // If setting as default, validate entity type
    if (createDto.isDefault) {
      const existing = await this.repository.findDefault(
        createDto.organizationId,
        createDto.entityType,
      );
      if (existing) {
        this.logger.warn(
          `Replacing existing default config for ${createDto.entityType}`,
        );
      }
    }

    const config = await this.repository.createConfig(createDto, createdBy);

    return new FieldMappingConfigResponseDto(config);
  }

  /**
   * List configurations for an organization
   */
  async listConfigs(
    organizationId: string,
    entityType?: string,
  ): Promise<FieldMappingConfigResponseDto[]> {
    const configs = await this.repository.findByOrganization(
      organizationId,
      entityType,
    );
    return configs.map((config) => new FieldMappingConfigResponseDto(config));
  }

  /**
   * Get configuration by ID
   */
  async getConfigById(id: string): Promise<FieldMappingConfigResponseDto> {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new NotFoundException(
        `Field mapping configuration ${id} not found`,
      );
    }

    return new FieldMappingConfigResponseDto(config);
  }

  /**
   * Get default configuration for entity type
   */
  async getDefaultConfig(
    organizationId: string,
    entityType: string,
  ): Promise<FieldMappingConfigResponseDto | null> {
    const config = await this.repository.findDefault(
      organizationId,
      entityType,
    );

    if (!config) {
      return null;
    }

    return new FieldMappingConfigResponseDto(config);
  }

  /**
   * Update configuration
   */
  async updateConfig(
    id: string,
    updates: Partial<CreateFieldMappingConfigDto>,
  ): Promise<FieldMappingConfigResponseDto> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundException(
        `Field mapping configuration ${id} not found`,
      );
    }

    const updated = await this.repository.updateConfig(id, updates);

    this.logger.log(`Updated field mapping config: ${id}`);

    return new FieldMappingConfigResponseDto(updated);
  }

  /**
   * Delete configuration
   */
  async deleteConfig(id: string): Promise<void> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundException(
        `Field mapping configuration ${id} not found`,
      );
    }

    await this.repository.deleteConfig(id);

    this.logger.log(`Deleted field mapping config: ${id}`);
  }

  /**
   * Set configuration as default
   */
  async setAsDefault(id: string): Promise<FieldMappingConfigResponseDto> {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new NotFoundException(
        `Field mapping configuration ${id} not found`,
      );
    }

    const updated = await this.repository.setAsDefault(
      id,
      config.organizationId,
      config.entityType,
    );

    this.logger.log(
      `Set field mapping config ${id} as default for ${config.entityType}`,
    );

    return new FieldMappingConfigResponseDto(updated);
  }

  /**
   * Apply field mapping to a CSV row
   */
  async applyMapping(
    configId: string,
    row: Record<string, any>,
    rowNumber: number,
  ): Promise<Record<string, any>> {
    const config = await this.repository.findById(configId);

    if (!config) {
      throw new NotFoundException(
        `Field mapping configuration ${configId} not found`,
      );
    }

    // Load lookup tables if needed
    const lookupTables = new Map<string, Map<string, string>>();
    const lookupConfigs = config.fieldMappings.filter(
      (m) => m.transformationType === 'lookup',
    );

    for (const mapping of lookupConfigs) {
      const tableName = (mapping.transformConfig as { tableName?: string })
        ?.tableName;
      if (tableName && !lookupTables.has(tableName)) {
        const table = await this.repository.findLookupTable(
          config.organizationId,
          tableName,
        );
        if (table) {
          const lookupMap = new Map<string, string>(
            table.lookupEntries.map((e) => [e.sourceValue, e.targetValue]),
          );
          lookupTables.set(tableName, lookupMap);
        }
      }
    }

    // Create transformation context
    const context: TransformationContext = {
      row,
      rowNumber,
      lookupTables,
    };

    // Apply transformations
    const result: Record<string, any> = {};

    for (const mapping of config.fieldMappings) {
      try {
        const value = this.transformationEngine.transform(
          mapping.sourceFields,
          mapping.transformationType as any,
          mapping.transformConfig,
          context,
          mapping.defaultValue ?? undefined,
        );

        result[mapping.targetField] = value;

        // Validate required fields
        if (mapping.isRequired && (value == null || value === '')) {
          throw new BadRequestException(
            `Required field '${mapping.targetField}' is missing at row ${rowNumber}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Mapping error for field '${mapping.targetField}' at row ${rowNumber}: ${error.message}`,
        );
        throw error;
      }
    }

    return result;
  }
}
