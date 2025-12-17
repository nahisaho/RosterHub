/**
 * Webhook Repository
 *
 * Data access layer for webhook entities
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  Webhook,
  WebhookDelivery,
  WebhookEvent,
  WebhookDeliveryStatus,
} from '@prisma/client';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new webhook subscription
   */
  async create(createDto: CreateWebhookDto): Promise<Webhook> {
    // Generate secure random secret for HMAC signature
    const secret = crypto.randomBytes(32).toString('hex');

    return await this.prisma.webhook.create({
      data: {
        url: createDto.url,
        events: createDto.events,
        secret,
        organizationId: createDto.organizationId,
        maxRetries: createDto.maxRetries ?? 3,
        retryBackoff: createDto.retryBackoff ?? 60,
      },
    });
  }

  /**
   * Find all webhooks for an organization
   */
  async findByOrganization(organizationId: string): Promise<Webhook[]> {
    return await this.prisma.webhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find webhook by ID
   */
  async findById(id: string): Promise<Webhook | null> {
    return await this.prisma.webhook.findUnique({
      where: { id },
    });
  }

  /**
   * Find active webhooks subscribed to specific event
   */
  async findActiveByEvent(event: WebhookEvent): Promise<Webhook[]> {
    return await this.prisma.webhook.findMany({
      where: {
        isActive: true,
        events: {
          has: event,
        },
      },
    });
  }

  /**
   * Update webhook
   */
  async update(id: string, updateDto: UpdateWebhookDto): Promise<Webhook> {
    return await this.prisma.webhook.update({
      where: { id },
      data: updateDto,
    });
  }

  /**
   * Delete webhook
   */
  async delete(id: string): Promise<Webhook> {
    return await this.prisma.webhook.delete({
      where: { id },
    });
  }

  /**
   * Update last triggered timestamp
   */
  async updateLastTriggered(id: string): Promise<Webhook> {
    return await this.prisma.webhook.update({
      where: { id },
      data: { lastTriggeredAt: new Date() },
    });
  }

  /**
   * Create a webhook delivery record
   */
  async createDelivery(
    webhookId: string,
    event: WebhookEvent,
    payload: any,
    maxAttempts: number,
  ): Promise<WebhookDelivery> {
    return await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        maxAttempts,
        status: WebhookDeliveryStatus.pending,
      },
    });
  }

  /**
   * Update delivery status after attempt
   */
  async updateDelivery(
    id: string,
    data: {
      status: WebhookDeliveryStatus;
      attempts: number;
      lastAttemptAt: Date;
      nextRetryAt?: Date;
      responseStatus?: number;
      responseBody?: string;
      errorMessage?: string;
      completedAt?: Date;
    },
  ): Promise<WebhookDelivery> {
    return await this.prisma.webhookDelivery.update({
      where: { id },
      data,
    });
  }

  /**
   * Find pending deliveries for retry
   */
  async findPendingRetries(): Promise<WebhookDelivery[]> {
    return await this.prisma.webhookDelivery.findMany({
      where: {
        status: {
          in: ['pending', 'retrying'],
        },
        nextRetryAt: {
          lte: new Date(),
        },
      },
      include: {
        webhook: true,
      },
      orderBy: { nextRetryAt: 'asc' },
      take: 100, // Process up to 100 retries per batch
    });
  }

  /**
   * Find deliveries for a webhook
   */
  async findDeliveriesByWebhook(
    webhookId: string,
    limit: number = 50,
  ): Promise<WebhookDelivery[]> {
    return await this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get delivery statistics for a webhook
   */
  async getDeliveryStats(webhookId: string): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
  }> {
    const [total, success, failed, pending] = await Promise.all([
      this.prisma.webhookDelivery.count({ where: { webhookId } }),
      this.prisma.webhookDelivery.count({
        where: { webhookId, status: 'success' },
      }),
      this.prisma.webhookDelivery.count({
        where: { webhookId, status: 'failed' },
      }),
      this.prisma.webhookDelivery.count({
        where: { webhookId, status: { in: ['pending', 'retrying'] } },
      }),
    ]);

    return { total, success, failed, pending };
  }
}
