/**
 * Webhook Retry Scheduler
 *
 * Scheduled task for processing webhook delivery retries
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhookService } from './webhook.service';

@Injectable()
export class WebhookRetryScheduler {
  private readonly logger = new Logger(WebhookRetryScheduler.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Process pending webhook retries every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleRetries() {
    this.logger.debug('Processing webhook delivery retries...');

    try {
      await this.webhookService.processRetries();
    } catch (error) {
      this.logger.error(
        `Error processing webhook retries: ${error.message}`,
        error.stack,
      );
    }
  }
}
