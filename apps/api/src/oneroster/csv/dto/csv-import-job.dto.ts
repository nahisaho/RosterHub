import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CSV Import Job Status
 */
export enum CsvImportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * CSV Import Job DTO
 *
 * Represents a CSV import job for processing OneRoster CSV files.
 *
 * Requirements Coverage:
 * - FR-CSV-001: CSV import with streaming parser
 * - FR-CSV-003: Background job processing with progress tracking
 */
export class CsvImportJobDto {
  @ApiProperty({ description: 'Job ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'File path on server' })
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiProperty({ description: 'Entity type being imported', example: 'users' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ enum: CsvImportJobStatus, description: 'Job status' })
  @IsEnum(CsvImportJobStatus)
  status: CsvImportJobStatus;

  @ApiProperty({ description: 'Total records in CSV', required: false })
  @IsOptional()
  totalRecords?: number;

  @ApiProperty({ description: 'Processed records count', required: false })
  @IsOptional()
  processedRecords?: number;

  @ApiProperty({ description: 'Successfully imported records', required: false })
  @IsOptional()
  successCount?: number;

  @ApiProperty({ description: 'Failed records count', required: false })
  @IsOptional()
  errorCount?: number;

  @ApiProperty({ description: 'Validation errors', type: [Object], required: false })
  @IsOptional()
  errors?: Array<{
    line: number;
    field?: string;
    value?: string;
    message: string;
  }>;

  @ApiProperty({ description: 'Progress percentage (0-100)', required: false })
  @IsOptional()
  progress?: number;

  @ApiProperty({ description: 'Job start timestamp', required: false })
  @IsOptional()
  startedAt?: Date;

  @ApiProperty({ description: 'Job completion timestamp', required: false })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ description: 'Error message if failed', required: false })
  @IsOptional()
  errorMessage?: string;
}

/**
 * Create CSV Import Job DTO
 */
export class CreateCsvImportJobDto {
  @ApiProperty({ description: 'Entity type to import', example: 'users' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({
    description: 'CSV file',
    type: 'string',
    format: 'binary'
  })
  file: any;
}

/**
 * CSV Import Job Response DTO
 */
export class CsvImportJobResponseDto {
  @ApiProperty({ description: 'Job ID' })
  id: string;

  @ApiProperty({ description: 'Job ID (alias for id)' })
  jobId: string;

  @ApiProperty({ description: 'Job status', enum: CsvImportJobStatus })
  status: CsvImportJobStatus;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Total records' })
  totalRecords: number;

  @ApiProperty({ description: 'Processed records' })
  processedRecords: number;

  @ApiProperty({ description: 'Success count' })
  successCount: number;

  @ApiProperty({ description: 'Error count' })
  errorCount: number;

  @ApiProperty({ description: 'Errors', type: [Object], required: false })
  errors?: Array<{
    line: number;
    field?: string;
    value?: string;
    message: string;
  }>;

  @ApiProperty({ description: 'Started at', required: false })
  startedAt?: string;

  @ApiProperty({ description: 'Completed at', required: false })
  completedAt?: string;

  @ApiProperty({ description: 'Error message', required: false })
  errorMessage?: string;

  constructor(job: CsvImportJobDto) {
    this.id = job.id;
    this.jobId = job.id; // Alias for compatibility
    this.status = job.status;
    this.progress = job.progress || 0;
    this.totalRecords = job.totalRecords || 0;
    this.processedRecords = job.processedRecords || 0;
    this.successCount = job.successCount || 0;
    this.errorCount = job.errorCount || 0;
    this.errors = job.errors;
    this.startedAt = job.startedAt?.toISOString();
    this.completedAt = job.completedAt?.toISOString();
    this.errorMessage = job.errorMessage;
  }
}
