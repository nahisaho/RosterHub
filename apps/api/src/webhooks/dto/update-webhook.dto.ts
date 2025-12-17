/**
 * Update Webhook DTO
 *
 * Request body for webhook updates
 */

import {
  IsUrl,
  IsArray,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEvent } from './create-webhook.dto';

export class UpdateWebhookDto {
  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://example.com/webhooks/rosterhub',
    required: false,
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: true })
  url?: string;

  @ApiProperty({
    description: 'Events to subscribe to',
    enum: WebhookEvent,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events?: WebhookEvent[];

  @ApiProperty({
    description: 'Active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Maximum number of retry attempts',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiProperty({
    description: 'Retry backoff in seconds',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  retryBackoff?: number;
}
