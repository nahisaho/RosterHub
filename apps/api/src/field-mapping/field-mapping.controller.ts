/**
 * Field Mapping Controller
 *
 * REST API endpoints for field mapping configuration
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FieldMappingService } from './field-mapping.service';
import { CreateFieldMappingConfigDto } from './dto/create-field-mapping-config.dto';
import { FieldMappingConfigResponseDto } from './dto/field-mapping-config-response.dto';

@ApiTags('Field Mapping')
@Controller('api/v1/field-mapping')
@ApiBearerAuth()
export class FieldMappingController {
  constructor(private readonly fieldMappingService: FieldMappingService) {}

  /**
   * Create a new field mapping configuration
   */
  @Post('configs')
  @ApiOperation({
    summary: 'Create field mapping configuration',
    description: 'Create a new CSV field mapping configuration for an entity type',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuration created successfully',
    type: FieldMappingConfigResponseDto,
  })
  async createConfig(
    @Body() createDto: CreateFieldMappingConfigDto,
    // TODO: Extract from JWT token
    // @CurrentUser() user: User,
  ): Promise<FieldMappingConfigResponseDto> {
    const createdBy = 'system'; // TODO: Get from authenticated user
    return this.fieldMappingService.createConfig(createDto, createdBy);
  }

  /**
   * List field mapping configurations
   */
  @Get('configs')
  @ApiOperation({
    summary: 'List field mapping configurations',
    description: 'Get all field mapping configurations for an organization',
  })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiResponse({
    status: 200,
    description: 'Configurations retrieved successfully',
    type: [FieldMappingConfigResponseDto],
  })
  async listConfigs(
    @Query('organizationId') organizationId: string,
    @Query('entityType') entityType?: string,
  ): Promise<FieldMappingConfigResponseDto[]> {
    return this.fieldMappingService.listConfigs(organizationId, entityType);
  }

  /**
   * Get field mapping configuration by ID
   */
  @Get('configs/:id')
  @ApiOperation({
    summary: 'Get field mapping configuration',
    description: 'Retrieve field mapping configuration details',
  })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
    type: FieldMappingConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfig(@Param('id') id: string): Promise<FieldMappingConfigResponseDto> {
    return this.fieldMappingService.getConfigById(id);
  }

  /**
   * Get default field mapping configuration
   */
  @Get('configs/default/:entityType')
  @ApiOperation({
    summary: 'Get default field mapping configuration',
    description: 'Retrieve the default field mapping configuration for an entity type',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Default configuration retrieved successfully',
    type: FieldMappingConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No default configuration found' })
  async getDefaultConfig(
    @Param('entityType') entityType: string,
    @Query('organizationId') organizationId: string,
  ): Promise<FieldMappingConfigResponseDto | null> {
    return this.fieldMappingService.getDefaultConfig(organizationId, entityType);
  }

  /**
   * Update field mapping configuration
   */
  @Put('configs/:id')
  @ApiOperation({
    summary: 'Update field mapping configuration',
    description: 'Update field mapping configuration details and rules',
  })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
    type: FieldMappingConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async updateConfig(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateFieldMappingConfigDto>,
  ): Promise<FieldMappingConfigResponseDto> {
    return this.fieldMappingService.updateConfig(id, updateDto);
  }

  /**
   * Delete field mapping configuration
   */
  @Delete('configs/:id')
  @ApiOperation({
    summary: 'Delete field mapping configuration',
    description: 'Delete a field mapping configuration',
  })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({ status: 204, description: 'Configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async deleteConfig(@Param('id') id: string): Promise<void> {
    return this.fieldMappingService.deleteConfig(id);
  }

  /**
   * Set configuration as default
   */
  @Post('configs/:id/set-default')
  @ApiOperation({
    summary: 'Set configuration as default',
    description: 'Set this configuration as the default for its entity type',
  })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration set as default successfully',
    type: FieldMappingConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async setAsDefault(@Param('id') id: string): Promise<FieldMappingConfigResponseDto> {
    return this.fieldMappingService.setAsDefault(id);
  }
}
