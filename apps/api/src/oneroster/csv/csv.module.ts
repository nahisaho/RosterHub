import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { CsvImportController } from './csv-import.controller';
import { CsvExportController } from './csv-export.controller';
import { CsvImportService } from './services/csv-import.service';
import { CsvExportService } from './services/csv-export.service';
import { CsvValidatorService } from './validators/csv-validator.service';
import { CsvImportProcessor } from './processors/csv-import.processor';
import { DatabaseModule } from '../../database/database.module';
import { CommonModule } from '../../common/common.module';
import { UsersRepository } from '../entities/users/users.repository';
import { OrgsRepository } from '../entities/orgs/orgs.repository';
import { ClassesRepository } from '../entities/classes/classes.repository';
import { CoursesRepository } from '../entities/courses/courses.repository';
import { EnrollmentsRepository } from '../entities/enrollments/enrollments.repository';
import { AcademicSessionsRepository } from '../entities/academic-sessions/academic-sessions.repository';
import { DemographicsRepository } from '../entities/demographics/demographics.repository';

/**
 * CSV Module
 *
 * Provides CSV import/export functionality for OneRoster entities.
 *
 * Features:
 * - CSV import with streaming parser (handles 100MB+ files)
 * - CSV export with OneRoster Japan Profile formatting
 * - Delta export for incremental sync
 * - Background job processing with BullMQ
 * - Real-time validation with OneRoster Japan Profile rules
 * - Progress tracking and error reporting
 * - File upload with Multer
 *
 * Requirements Coverage:
 * - FR-CSV-001: CSV import with streaming parser
 * - FR-CSV-002: CSV validation
 * - FR-CSV-003: Background job processing
 * - FR-CSV-004: Validation error reporting
 * - FR-CSV-005: Duplicate detection
 * - FR-CSV-006: CSV export with Japan Profile formatting
 * - FR-CSV-007: Delta export
 *
 * @module
 */
@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    // BullMQ Queue Configuration
    BullModule.registerQueue({
      name: 'csv-import',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 7 * 24 * 3600, // Keep completed jobs for 7 days
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 14 * 24 * 3600, // Keep failed jobs for 14 days
        },
      },
    }),
    // Multer Configuration for File Upload
    MulterModule.register({
      dest: './uploads/csv',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  ],
  controllers: [CsvImportController, CsvExportController],
  providers: [
    CsvImportService,
    CsvExportService,
    CsvValidatorService,
    CsvImportProcessor,
    // Entity Repositories
    UsersRepository,
    OrgsRepository,
    ClassesRepository,
    CoursesRepository,
    EnrollmentsRepository,
    AcademicSessionsRepository,
    DemographicsRepository,
  ],
  exports: [CsvImportService, CsvExportService, CsvValidatorService],
})
export class CsvModule {}
