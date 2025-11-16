/**
 * Webhook Module
 *
 * NestJS module for webhook management
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookRepository } from './repositories/webhook.repository';
import { WebhookRetryScheduler } from './webhook-retry.scheduler';
import { WebhookEventsService } from './webhook-events.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    HttpModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
    }),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WebhookRepository,
    WebhookRetryScheduler,
    WebhookEventsService,
  ],
  exports: [WebhookService, WebhookEventsService],
})
export class WebhookModule {}
