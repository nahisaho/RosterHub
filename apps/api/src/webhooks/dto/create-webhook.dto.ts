/**
 * Create Webhook DTO
 *
 * Request body for webhook registration
 */

import { IsUrl, IsArray, IsEnum, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WebhookEvent {
  CSV_IMPORT_COMPLETED = 'csv_import_completed',
  CSV_IMPORT_FAILED = 'csv_import_failed',
  CSV_IMPORT_PROCESSING = 'csv_import_processing',
  ENTITY_CREATED = 'entity_created',
  ENTITY_UPDATED = 'entity_updated',
  ENTITY_DELETED = 'entity_deleted',
}

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Webhook endpoint URL (HTTPS required for production)',
    example: 'https://example.com/webhooks/rosterhub',
  })
  @IsUrl({ require_protocol: true, require_tld: true })
  url: string;

  @ApiProperty({
    description: 'Events to subscribe to',
    enum: WebhookEvent,
    isArray: true,
    example: [WebhookEvent.CSV_IMPORT_COMPLETED, WebhookEvent.CSV_IMPORT_FAILED],
  })
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[];

  @ApiProperty({
    description: 'Organization ID for this webhook',
    example: 'org-12345',
  })
  @IsString()
  organizationId: string;

  @ApiProperty({
    description: 'Maximum number of retry attempts (default: 3)',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiProperty({
    description: 'Retry backoff in seconds (default: 60)',
    example: 60,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  retryBackoff?: number;
}
