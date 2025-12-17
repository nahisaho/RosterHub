/**
 * Webhook Controller
 *
 * REST API endpoints for webhook management
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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import {
  WebhookResponseDto,
  WebhookDeliveryResponseDto,
} from './dto/webhook-response.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard) // API key authentication enabled
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Register a new webhook
   */
  @Post()
  @ApiOperation({
    summary: 'Register a new webhook',
    description: 'Create a webhook subscription for specific events',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async register(
    @Body() createDto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    return this.webhookService.register(createDto);
  }

  /**
   * List webhooks for an organization
   */
  @Get()
  @ApiOperation({
    summary: 'List webhooks',
    description: 'Get all webhooks for an organization',
  })
  @ApiQuery({
    name: 'organizationId',
    required: true,
    description: 'Organization ID to filter webhooks',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhooks retrieved successfully',
    type: [WebhookResponseDto],
  })
  async list(
    @Query('organizationId') organizationId: string,
  ): Promise<WebhookResponseDto[]> {
    return this.webhookService.listByOrganization(organizationId);
  }

  /**
   * Get webhook by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get webhook by ID',
    description:
      'Retrieve webhook details including secret for signature verification',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook retrieved successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getById(@Param('id') id: string): Promise<WebhookResponseDto> {
    return this.webhookService.getById(id);
  }

  /**
   * Update webhook
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update webhook',
    description: 'Update webhook configuration (URL, events, active status)',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    return this.webhookService.update(id, updateDto);
  }

  /**
   * Delete webhook
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete webhook',
    description: 'Delete a webhook subscription',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.webhookService.delete(id);
  }

  /**
   * Get webhook delivery history
   */
  @Get(':id/deliveries')
  @ApiOperation({
    summary: 'Get delivery history',
    description: 'Retrieve webhook delivery attempts and their statuses',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of deliveries to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Deliveries retrieved successfully',
    type: [WebhookDeliveryResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getDeliveries(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<WebhookDeliveryResponseDto[]> {
    return this.webhookService.getDeliveries(id, limit);
  }

  /**
   * Get webhook statistics
   */
  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get webhook statistics',
    description: 'Retrieve delivery success rate and counts',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      properties: {
        total: { type: 'number', example: 100 },
        success: { type: 'number', example: 95 },
        failed: { type: 'number', example: 3 },
        pending: { type: 'number', example: 2 },
        successRate: { type: 'number', example: 95.0 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getStats(@Param('id') id: string): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    successRate: number;
  }> {
    return this.webhookService.getStats(id);
  }
}
