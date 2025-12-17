import { Injectable, Logger } from '@nestjs/common';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { CsvEntityMapper, CsvRow } from '../mappers/csv-entity.mapper';
import {
  CsvValidatorService,
  ValidationError,
} from '../validators/csv-validator.service';
import { CsvImportJobDto, CsvImportJobStatus } from '../dto/csv-import-job.dto';
import { PrismaService } from '../../../database/prisma.service';
import { UsersRepository } from '../../entities/users/users.repository';
import { OrgsRepository } from '../../entities/orgs/orgs.repository';
import { ClassesRepository } from '../../entities/classes/classes.repository';
import { CoursesRepository } from '../../entities/courses/courses.repository';
import { EnrollmentsRepository } from '../../entities/enrollments/enrollments.repository';
import { AcademicSessionsRepository } from '../../entities/academic-sessions/academic-sessions.repository';
import { DemographicsRepository } from '../../entities/demographics/demographics.repository';

/**
 * CSV Import Service
 *
 * Handles CSV file import with streaming parser for large files.
 *
 * Features:
 * - Streaming CSV parsing (handles 100MB+ files)
 * - Batch database inserts (1000 records per batch)
 * - Real-time validation with detailed error reporting
 * - Progress tracking
 * - Transaction support for data integrity
 *
 * Requirements Coverage:
 * - FR-CSV-001: CSV import with streaming parser (200,000+ records)
 * - FR-CSV-002: CSV validation with Japan Profile rules
 * - FR-CSV-003: Background job processing with progress tracking
 * - FR-CSV-004: Validation error reporting
 * - FR-CSV-005: Duplicate detection (sourcedId uniqueness)
 * - NFR-PERF-002: Handle 100MB+ CSV files in 30 minutes
 */
@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);
  private readonly BATCH_SIZE = 1000; // Insert 1000 records per batch

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvValidator: CsvValidatorService,
    private readonly usersRepository: UsersRepository,
    private readonly orgsRepository: OrgsRepository,
    private readonly classesRepository: ClassesRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly academicSessionsRepository: AcademicSessionsRepository,
    private readonly demographicsRepository: DemographicsRepository,
  ) {}

  /**
   * Imports CSV file with streaming parser
   *
   * Process:
   * 1. Parse CSV with streaming parser (csv-parse)
   * 2. Validate each row according to OneRoster Japan Profile
   * 3. Batch insert valid records (1000 per batch)
   * 4. Track progress and report errors
   * 5. Update job status
   *
   * @param job - Import job metadata
   * @returns Updated job with results
   */
  async importCsv(job: CsvImportJobDto): Promise<CsvImportJobDto> {
    this.logger.log(
      `Starting CSV import job ${job.id} for entity type: ${job.entityType}`,
    );

    // Update job status to processing
    job.status = CsvImportJobStatus.PROCESSING;
    job.startedAt = new Date();
    job.processedRecords = 0;
    job.successCount = 0;
    job.errorCount = 0;
    job.errors = [];

    try {
      // Select repository based on entity type
      const repository = this.getRepository(job.entityType);
      if (!repository) {
        throw new Error(`Unknown entity type: ${job.entityType}`);
      }

      // Stream CSV file
      const fileStream = createReadStream(job.filePath);
      const parser = fileStream.pipe(
        parse({
          columns: true, // Use first row as column names
          skip_empty_lines: true,
          trim: true,
          cast: false, // Keep all values as strings for validation
          relax_column_count: true, // Allow varying column counts
        }),
      );

      // Handle stream errors
      const streamError = await new Promise<Error | null>((resolve) => {
        fileStream.on('error', (error) => resolve(error));
        parser.on('error', (error) => resolve(error));
        parser.on('readable', () => resolve(null));
      });

      if (streamError) {
        throw streamError;
      }

      let lineNumber = 1; // CSV line number (excluding header)
      let batch: any[] = [];
      const allErrors: ValidationError[] = [];

      // Process CSV rows
      for await (const row of parser) {
        lineNumber++;

        // Validate row
        const validationResult = this.csvValidator.validateRow(
          row as CsvRow,
          job.entityType,
          lineNumber,
        );

        if (!validationResult.valid) {
          // Collect validation errors
          allErrors.push(...validationResult.errors);
          job.errorCount++;
        } else {
          // Map CSV row to entity data
          const entityData = this.mapCsvRow(row, job.entityType);
          batch.push(entityData);

          // Insert batch when it reaches BATCH_SIZE
          if (batch.length >= this.BATCH_SIZE) {
            await this.insertBatch(repository, batch, job);
            batch = []; // Clear batch
          }
        }

        job.processedRecords++;

        // Update progress every 1000 records
        if (job.processedRecords % 1000 === 0) {
          job.progress = job.totalRecords
            ? Math.round((job.processedRecords / job.totalRecords) * 100)
            : 0;
          this.logger.log(
            `CSV import progress: ${job.processedRecords} / ${job.totalRecords} (${job.progress}%)`,
          );
        }
      }

      // Insert remaining batch
      if (batch.length > 0) {
        await this.insertBatch(repository, batch, job);
      }

      // Store errors (limit to first 1000 errors)
      job.errors = allErrors.slice(0, 1000);
      if (allErrors.length > 1000) {
        this.logger.warn(
          `CSV import had ${allErrors.length} errors, only first 1000 are stored`,
        );
      }

      // Update job status
      job.status =
        job.errorCount > 0
          ? CsvImportJobStatus.COMPLETED
          : CsvImportJobStatus.COMPLETED;
      job.completedAt = new Date();
      job.progress = 100;

      this.logger.log(
        `CSV import job ${job.id} completed: ${job.successCount} success, ${job.errorCount} errors`,
      );

      return job;
    } catch (error) {
      this.logger.error(
        `CSV import job ${job.id} failed: ${error.message}`,
        error.stack,
      );

      job.status = CsvImportJobStatus.FAILED;
      job.errorMessage = error.message;
      job.completedAt = new Date();

      return job;
    }
  }

  /**
   * Inserts a batch of records into database
   *
   * Uses upsert to handle duplicates (update if exists, insert if not).
   *
   * @param repository - Entity repository
   * @param batch - Batch of entity data
   * @param job - Import job (for tracking)
   */
  private async insertBatch(
    repository: any,
    batch: any[],
    job: CsvImportJobDto,
  ): Promise<void> {
    try {
      // Use transaction for batch insert
      await this.prisma.$transaction(async (_tx) => {
        for (const entityData of batch) {
          try {
            // Upsert: update if exists, insert if not
            await repository.upsert(entityData.sourcedId, {
              ...entityData,
            });
            job.successCount = (job.successCount ?? 0) + 1;
          } catch (error) {
            // Record insert error
            job.errorCount = (job.errorCount ?? 0) + 1;
            job.errors?.push({
              line: -1, // Unknown line number in batch
              field: 'sourcedId',
              value: entityData.sourcedId,
              message: `Failed to insert record: ${error.message}`,
            });
          }
        }
      });

      this.logger.debug(`Inserted batch of ${batch.length} records`);
    } catch (error) {
      this.logger.error(
        `Failed to insert batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets repository for entity type
   *
   * @param entityType - Entity type (users, orgs, classes, etc.)
   * @returns Repository instance
   */
  private getRepository(entityType: string): any {
    switch (entityType) {
      case 'users':
        return this.usersRepository;
      case 'orgs':
        return this.orgsRepository;
      case 'classes':
        return this.classesRepository;
      case 'courses':
        return this.coursesRepository;
      case 'enrollments':
        return this.enrollmentsRepository;
      case 'academicSessions':
        return this.academicSessionsRepository;
      case 'demographics':
        return this.demographicsRepository;
      default:
        return null;
    }
  }

  /**
   * Maps CSV row to entity data
   *
   * @param row - CSV row
   * @param entityType - Entity type
   * @returns Mapped entity data
   */
  private mapCsvRow(row: any, entityType: string): any {
    switch (entityType) {
      case 'users':
        return CsvEntityMapper.mapUserCsvRow(row);
      case 'orgs':
        return CsvEntityMapper.mapOrgCsvRow(row);
      case 'classes':
        return CsvEntityMapper.mapClassCsvRow(row);
      case 'courses':
        return CsvEntityMapper.mapCourseCsvRow(row);
      case 'enrollments':
        return CsvEntityMapper.mapEnrollmentCsvRow(row);
      case 'academicSessions':
        return CsvEntityMapper.mapAcademicSessionCsvRow(row);
      case 'demographics':
        return CsvEntityMapper.mapDemographicCsvRow(row);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Counts total records in CSV file (for progress tracking)
   *
   * @param filePath - Path to CSV file
   * @returns Total record count
   */
  async countCsvRecords(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 0;
      const fileStream = createReadStream(filePath);
      const parser = fileStream.pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
        }),
      );

      parser.on('data', () => {
        count++;
      });

      parser.on('end', () => {
        resolve(count);
      });

      parser.on('error', (error) => {
        reject(error);
      });
    });
  }
}
