/**
 * Webhook Service
 *
 * Business logic for webhook management and delivery
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WebhookRepository } from './repositories/webhook.repository';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookResponseDto, WebhookDeliveryResponseDto } from './dto/webhook-response.dto';
import { Webhook, WebhookDelivery } from '@prisma/client';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly webhookRepository: WebhookRepository) {}

  /**
   * Register a new webhook
   */
  async register(createDto: CreateWebhookDto): Promise<WebhookResponseDto> {
    this.logger.log(`Registering webhook for organization: ${createDto.organizationId}`);

    const webhook = await this.webhookRepository.create(createDto);

    return new WebhookResponseDto(webhook);
  }

  /**
   * List webhooks for an organization
   */
  async listByOrganization(organizationId: string): Promise<WebhookResponseDto[]> {
    const webhooks = await this.webhookRepository.findByOrganization(organizationId);
    return webhooks.map((webhook) => new WebhookResponseDto(webhook));
  }

  /**
   * Get webhook by ID
   */
  async getById(id: string): Promise<WebhookResponseDto> {
    const webhook = await this.webhookRepository.findById(id);

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    return new WebhookResponseDto(webhook);
  }

  /**
   * Update webhook
   */
  async update(id: string, updateDto: UpdateWebhookDto): Promise<WebhookResponseDto> {
    const webhook = await this.webhookRepository.findById(id);

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const updated = await this.webhookRepository.update(id, updateDto);

    this.logger.log(`Webhook ${id} updated`);

    return new WebhookResponseDto(updated);
  }

  /**
   * Delete webhook
   */
  async delete(id: string): Promise<void> {
    const webhook = await this.webhookRepository.findById(id);

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    await this.webhookRepository.delete(id);

    this.logger.log(`Webhook ${id} deleted`);
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerEvent(event: string, payload: any): Promise<void> {
    const webhooks = await this.webhookRepository.findActiveByEvent(event);

    if (webhooks.length === 0) {
      this.logger.debug(`No active webhooks for event: ${event}`);
      return;
    }

    this.logger.log(`Triggering ${webhooks.length} webhooks for event: ${event}`);

    // Create delivery records for all webhooks
    const deliveryPromises = webhooks.map((webhook) =>
      this.createDelivery(webhook, event, payload),
    );

    await Promise.all(deliveryPromises);
  }

  /**
   * Create and attempt webhook delivery
   */
  private async createDelivery(
    webhook: Webhook,
    event: string,
    payload: any,
  ): Promise<void> {
    // Create delivery record
    const delivery = await this.webhookRepository.createDelivery(
      webhook.id,
      event,
      payload,
      webhook.maxRetries,
    );

    // Attempt immediate delivery
    await this.attemptDelivery(webhook, delivery);

    // Update last triggered timestamp
    await this.webhookRepository.updateLastTriggered(webhook.id);
  }

  /**
   * Attempt webhook delivery with retry logic
   */
  async attemptDelivery(
    webhook: Webhook,
    delivery: WebhookDelivery,
  ): Promise<void> {
    const attempt = delivery.attempts + 1;

    this.logger.debug(
      `Attempting delivery ${delivery.id} to ${webhook.url} (attempt ${attempt}/${delivery.maxAttempts})`,
    );

    try {
      // Generate HMAC signature for payload verification
      const signature = this.generateSignature(delivery.payload, webhook.secret);

      // Send POST request to webhook URL
      const response = await axios.post(webhook.url, delivery.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': delivery.event,
          'X-Webhook-Delivery-ID': delivery.id,
          'User-Agent': 'RosterHub-Webhook/1.0',
        },
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Success
      await this.webhookRepository.updateDelivery(delivery.id, {
        status: 'success',
        attempts: attempt,
        lastAttemptAt: new Date(),
        responseStatus: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 1000), // Limit response body size
        completedAt: new Date(),
      });

      this.logger.log(
        `Webhook delivery ${delivery.id} successful (HTTP ${response.status})`,
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      const responseStatus = axiosError.response?.status;
      const errorMessage = axiosError.message;

      this.logger.warn(
        `Webhook delivery ${delivery.id} failed (attempt ${attempt}/${delivery.maxAttempts}): ${errorMessage}`,
      );

      // Determine if retry is needed
      const shouldRetry = attempt < delivery.maxAttempts;
      const nextRetryAt = shouldRetry
        ? new Date(Date.now() + webhook.retryBackoff * 1000 * Math.pow(2, attempt - 1)) // Exponential backoff
        : undefined;

      await this.webhookRepository.updateDelivery(delivery.id, {
        status: shouldRetry ? 'retrying' : 'failed',
        attempts: attempt,
        lastAttemptAt: new Date(),
        nextRetryAt,
        responseStatus,
        errorMessage: errorMessage.substring(0, 500),
        completedAt: shouldRetry ? undefined : new Date(),
      });
    }
  }

  /**
   * Process pending webhook retries
   * Called by scheduled task (e.g., every minute)
   */
  async processRetries(): Promise<void> {
    const pendingDeliveries = await this.webhookRepository.findPendingRetries();

    if (pendingDeliveries.length === 0) {
      return;
    }

    this.logger.log(`Processing ${pendingDeliveries.length} pending webhook retries`);

    for (const delivery of pendingDeliveries) {
      try {
        await this.attemptDelivery(delivery.webhook, delivery);
      } catch (error) {
        this.logger.error(
          `Error processing retry for delivery ${delivery.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDeliveryResponseDto[]> {
    const webhook = await this.webhookRepository.findById(webhookId);

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${webhookId} not found`);
    }

    const deliveries = await this.webhookRepository.findDeliveriesByWebhook(webhookId, limit);

    return deliveries.map((delivery) => new WebhookDeliveryResponseDto(delivery));
  }

  /**
   * Get delivery statistics for a webhook
   */
  async getStats(webhookId: string): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    successRate: number;
  }> {
    const webhook = await this.webhookRepository.findById(webhookId);

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${webhookId} not found`);
    }

    const stats = await this.webhookRepository.getDeliveryStats(webhookId);

    const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;

    return {
      ...stats,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Generate HMAC-SHA256 signature for payload
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature (for webhook receivers to validate authenticity)
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
