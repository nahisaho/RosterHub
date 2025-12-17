/**
 * Webhook Events Service
 *
 * Service for triggering webhook events from application events
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookService } from './webhook.service';
import { WebhookEvent } from './dto/create-webhook.dto';

export interface CsvImportEventPayload {
  jobId: string;
  entityType: string;
  fileName: string;
  status: string;
  totalRecords?: number;
  processedRecords?: number;
  successRecords?: number;
  failedRecords?: number;
  errors?: any[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface EntityEventPayload {
  entityType: string;
  sourcedId: string;
  action: 'created' | 'updated' | 'deleted';
  data?: any;
  timestamp: Date;
}

@Injectable()
export class WebhookEventsService {
  private readonly logger = new Logger(WebhookEventsService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly webhookService: WebhookService,
  ) {
    // Register event listeners
    this.registerEventListeners();
  }

  /**
   * Register listeners for application events
   */
  private registerEventListeners(): void {
    // CSV Import events
    this.eventEmitter.on(
      'csv.import.processing',
      (payload: CsvImportEventPayload) => {
        this.handleCsvImportProcessing(payload);
      },
    );

    this.eventEmitter.on(
      'csv.import.completed',
      (payload: CsvImportEventPayload) => {
        this.handleCsvImportCompleted(payload);
      },
    );

    this.eventEmitter.on(
      'csv.import.failed',
      (payload: CsvImportEventPayload) => {
        this.handleCsvImportFailed(payload);
      },
    );

    // Entity events
    this.eventEmitter.on('entity.created', (payload: EntityEventPayload) => {
      this.handleEntityCreated(payload);
    });

    this.eventEmitter.on('entity.updated', (payload: EntityEventPayload) => {
      this.handleEntityUpdated(payload);
    });

    this.eventEmitter.on('entity.deleted', (payload: EntityEventPayload) => {
      this.handleEntityDeleted(payload);
    });

    this.logger.log('Webhook event listeners registered');
  }

  /**
   * Handle CSV import processing event
   */
  private async handleCsvImportProcessing(
    payload: CsvImportEventPayload,
  ): Promise<void> {
    this.logger.debug(`CSV import processing event: ${payload.jobId}`);

    await this.webhookService.triggerEvent(WebhookEvent.CSV_IMPORT_PROCESSING, {
      event: WebhookEvent.CSV_IMPORT_PROCESSING,
      timestamp: new Date().toISOString(),
      data: {
        jobId: payload.jobId,
        entityType: payload.entityType,
        fileName: payload.fileName,
        status: payload.status,
        totalRecords: payload.totalRecords,
        processedRecords: payload.processedRecords,
        startedAt: payload.startedAt?.toISOString(),
      },
    });
  }

  /**
   * Handle CSV import completed event
   */
  private async handleCsvImportCompleted(
    payload: CsvImportEventPayload,
  ): Promise<void> {
    this.logger.log(`CSV import completed event: ${payload.jobId}`);

    await this.webhookService.triggerEvent(WebhookEvent.CSV_IMPORT_COMPLETED, {
      event: WebhookEvent.CSV_IMPORT_COMPLETED,
      timestamp: new Date().toISOString(),
      data: {
        jobId: payload.jobId,
        entityType: payload.entityType,
        fileName: payload.fileName,
        status: payload.status,
        totalRecords: payload.totalRecords,
        processedRecords: payload.processedRecords,
        successRecords: payload.successRecords,
        failedRecords: payload.failedRecords,
        startedAt: payload.startedAt?.toISOString(),
        completedAt: payload.completedAt?.toISOString(),
      },
    });
  }

  /**
   * Handle CSV import failed event
   */
  private async handleCsvImportFailed(
    payload: CsvImportEventPayload,
  ): Promise<void> {
    this.logger.warn(`CSV import failed event: ${payload.jobId}`);

    await this.webhookService.triggerEvent(WebhookEvent.CSV_IMPORT_FAILED, {
      event: WebhookEvent.CSV_IMPORT_FAILED,
      timestamp: new Date().toISOString(),
      data: {
        jobId: payload.jobId,
        entityType: payload.entityType,
        fileName: payload.fileName,
        status: payload.status,
        totalRecords: payload.totalRecords,
        processedRecords: payload.processedRecords,
        errors: payload.errors?.slice(0, 10), // Limit to first 10 errors
        startedAt: payload.startedAt?.toISOString(),
        completedAt: payload.completedAt?.toISOString(),
      },
    });
  }

  /**
   * Handle entity created event
   */
  private async handleEntityCreated(
    payload: EntityEventPayload,
  ): Promise<void> {
    this.logger.debug(
      `Entity created event: ${payload.entityType}/${payload.sourcedId}`,
    );

    await this.webhookService.triggerEvent(WebhookEvent.ENTITY_CREATED, {
      event: WebhookEvent.ENTITY_CREATED,
      timestamp: payload.timestamp.toISOString(),
      data: {
        entityType: payload.entityType,
        sourcedId: payload.sourcedId,
        action: payload.action,
        data: payload.data,
      },
    });
  }

  /**
   * Handle entity updated event
   */
  private async handleEntityUpdated(
    payload: EntityEventPayload,
  ): Promise<void> {
    this.logger.debug(
      `Entity updated event: ${payload.entityType}/${payload.sourcedId}`,
    );

    await this.webhookService.triggerEvent(WebhookEvent.ENTITY_UPDATED, {
      event: WebhookEvent.ENTITY_UPDATED,
      timestamp: payload.timestamp.toISOString(),
      data: {
        entityType: payload.entityType,
        sourcedId: payload.sourcedId,
        action: payload.action,
        data: payload.data,
      },
    });
  }

  /**
   * Handle entity deleted event
   */
  private async handleEntityDeleted(
    payload: EntityEventPayload,
  ): Promise<void> {
    this.logger.debug(
      `Entity deleted event: ${payload.entityType}/${payload.sourcedId}`,
    );

    await this.webhookService.triggerEvent(WebhookEvent.ENTITY_DELETED, {
      event: WebhookEvent.ENTITY_DELETED,
      timestamp: payload.timestamp.toISOString(),
      data: {
        entityType: payload.entityType,
        sourcedId: payload.sourcedId,
        action: payload.action,
      },
    });
  }

  /**
   * Emit CSV import processing event
   */
  emitCsvImportProcessing(payload: CsvImportEventPayload): void {
    this.eventEmitter.emit('csv.import.processing', payload);
  }

  /**
   * Emit CSV import completed event
   */
  emitCsvImportCompleted(payload: CsvImportEventPayload): void {
    this.eventEmitter.emit('csv.import.completed', payload);
  }

  /**
   * Emit CSV import failed event
   */
  emitCsvImportFailed(payload: CsvImportEventPayload): void {
    this.eventEmitter.emit('csv.import.failed', payload);
  }

  /**
   * Emit entity created event
   */
  emitEntityCreated(payload: EntityEventPayload): void {
    this.eventEmitter.emit('entity.created', payload);
  }

  /**
   * Emit entity updated event
   */
  emitEntityUpdated(payload: EntityEventPayload): void {
    this.eventEmitter.emit('entity.updated', payload);
  }

  /**
   * Emit entity deleted event
   */
  emitEntityDeleted(payload: EntityEventPayload): void {
    this.eventEmitter.emit('entity.deleted', payload);
  }
}
