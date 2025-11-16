/**
 * Webhook Response DTO
 *
 * Response format for webhook queries
 */

import { ApiProperty } from '@nestjs/swagger';
import { WebhookEvent } from './create-webhook.dto';

export class WebhookResponseDto {
  @ApiProperty({ description: 'Webhook ID' })
  id: string;

  @ApiProperty({ description: 'Webhook endpoint URL' })
  url: string;

  @ApiProperty({ description: 'Subscribed events', enum: WebhookEvent, isArray: true })
  events: WebhookEvent[];

  @ApiProperty({ description: 'Webhook secret (for HMAC signature validation)' })
  secret: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Maximum retry attempts' })
  maxRetries: number;

  @ApiProperty({ description: 'Retry backoff in seconds' })
  retryBackoff: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Last triggered timestamp', required: false })
  lastTriggeredAt?: Date;

  constructor(webhook: any) {
    this.id = webhook.id;
    this.url = webhook.url;
    this.events = webhook.events;
    this.secret = webhook.secret;
    this.isActive = webhook.isActive;
    this.organizationId = webhook.organizationId;
    this.maxRetries = webhook.maxRetries;
    this.retryBackoff = webhook.retryBackoff;
    this.createdAt = webhook.createdAt;
    this.updatedAt = webhook.updatedAt;
    this.lastTriggeredAt = webhook.lastTriggeredAt;
  }
}

export class WebhookDeliveryResponseDto {
  @ApiProperty({ description: 'Delivery ID' })
  id: string;

  @ApiProperty({ description: 'Webhook ID' })
  webhookId: string;

  @ApiProperty({ description: 'Event type', enum: WebhookEvent })
  event: WebhookEvent;

  @ApiProperty({ description: 'Delivery status' })
  status: string;

  @ApiProperty({ description: 'Number of attempts' })
  attempts: number;

  @ApiProperty({ description: 'Maximum attempts allowed' })
  maxAttempts: number;

  @ApiProperty({ description: 'Last attempt timestamp', required: false })
  lastAttemptAt?: Date;

  @ApiProperty({ description: 'Next retry timestamp', required: false })
  nextRetryAt?: Date;

  @ApiProperty({ description: 'HTTP response status', required: false })
  responseStatus?: number;

  @ApiProperty({ description: 'Error message', required: false })
  errorMessage?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Completion timestamp', required: false })
  completedAt?: Date;

  constructor(delivery: any) {
    this.id = delivery.id;
    this.webhookId = delivery.webhookId;
    this.event = delivery.event;
    this.status = delivery.status;
    this.attempts = delivery.attempts;
    this.maxAttempts = delivery.maxAttempts;
    this.lastAttemptAt = delivery.lastAttemptAt;
    this.nextRetryAt = delivery.nextRetryAt;
    this.responseStatus = delivery.responseStatus;
    this.errorMessage = delivery.errorMessage;
    this.createdAt = delivery.createdAt;
    this.completedAt = delivery.completedAt;
  }
}
