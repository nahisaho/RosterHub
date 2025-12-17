import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CsvImportService } from '../services/csv-import.service';
import { CsvImportJobDto } from '../dto/csv-import-job.dto';

/**
 * CSV Import Job Processor
 *
 * BullMQ worker that processes CSV import jobs in the background.
 *
 * Features:
 * - Asynchronous CSV processing
 * - Job retry on failure (3 attempts)
 * - Progress tracking
 * - Error handling and logging
 *
 * Requirements Coverage:
 * - FR-CSV-003: Background job processing with BullMQ
 * - NFR-PERF-002: Async processing for large files (100MB+, 30min)
 *
 * @processor
 */
@Processor('csv-import')
export class CsvImportProcessor extends WorkerHost {
  private readonly logger = new Logger(CsvImportProcessor.name);

  constructor(private readonly csvImportService: CsvImportService) {
    super();
  }

  /**
   * Processes CSV import job
   *
   * @param job - BullMQ job with import job data
   * @returns Updated import job with results
   */
  async process(job: Job<CsvImportJobDto>): Promise<CsvImportJobDto> {
    const importJob = job.data;

    this.logger.log(
      `Processing CSV import job: ${importJob.id} (entity: ${importJob.entityType})`,
    );

    try {
      // Count total records for progress tracking
      const totalRecords = await this.csvImportService.countCsvRecords(
        importJob.filePath,
      );
      importJob.totalRecords = totalRecords;

      this.logger.log(`CSV file has ${totalRecords} records`);

      // Update job progress (0%)
      await job.updateProgress(0);

      // Import CSV with streaming parser
      const result = await this.csvImportService.importCsv(importJob);

      // Update job progress (100%)
      await job.updateProgress(100);

      this.logger.log(
        `CSV import job ${importJob.id} completed: ${result.successCount} success, ${result.errorCount} errors`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `CSV import job ${importJob.id} failed: ${error.message}`,
        error.stack,
      );
      throw error; // BullMQ will retry
    }
  }

  /**
   * Hook: Called when job completes successfully
   */
  onCompleted(job: Job<CsvImportJobDto>, _result: CsvImportJobDto): void {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  /**
   * Hook: Called when job fails
   */
  onFailed(job: Job<CsvImportJobDto>, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Hook: Called when job is active (processing)
   */
  onActive(job: Job<CsvImportJobDto>): void {
    this.logger.log(`Job ${job.id} is now active`);
  }

  /**
   * Hook: Called when job progress is updated
   */
  onProgress(job: Job<CsvImportJobDto>, progress: number): void {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
