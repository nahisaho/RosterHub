import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
  HttpStatus,
  StreamableFile,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { CsvExportService } from './services/csv-export.service';

/**
 * CSV Export Controller
 *
 * Handles CSV file export and download for OneRoster entities.
 *
 * Endpoints:
 * - GET /api/v1/csv/export/:entityType - Export entity data to CSV
 * - GET /api/v1/csv/export/:entityType/delta - Delta export (incremental sync)
 *
 * Requirements Coverage:
 * - FR-CSV-006: CSV export with OneRoster Japan Profile formatting
 * - FR-CSV-007: Delta export (dateLastModified filtering)
 * - FR-API-008: Delta/Incremental API
 *
 * @controller
 */
@ApiTags('CSV Export')
@Controller('ims/oneroster/v1p2/csv/export')
@UseGuards(ApiKeyGuard, IpWhitelistGuard, RateLimitGuard)
@ApiBearerAuth()
export class CsvExportController {
  private readonly exportPath = './exports/csv';

  constructor(private readonly csvExportService: CsvExportService) {}

  /**
   * Export entity data to CSV file (Bulk)
   *
   * Generates a CSV file with all records for the specified entity type.
   *
   * @param entityType - Entity type (users, orgs, classes, etc.)
   * @param status - Filter by status (active, tobedeleted)
   * @param res - Express response object
   * @returns CSV file stream
   */
  @Get(':entityType')
  @ApiOperation({ summary: 'Export entity data to CSV (Bulk)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'tobedeleted'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file generated and downloaded successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid entity type',
  })
  async exportCsv(
    @Param('entityType') entityType: string,
    @Res({ passthrough: true }) res: Response,
    @Query('status') status?: string,
  ): Promise<StreamableFile> {
    // Validate entity type
    const validEntityTypes = [
      'users',
      'orgs',
      'classes',
      'courses',
      'enrollments',
      'academicSessions',
      'demographics',
    ];

    if (!validEntityTypes.includes(entityType)) {
      throw new BadRequestException(
        `Invalid entity type: ${entityType}. Must be one of: ${validEntityTypes.join(', ')}`,
      );
    }

    // Generate unique filename
    const filename = `${entityType}-${new Date().toISOString().split('T')[0]}-${uuidv4()}.csv`;
    const filePath = `${this.exportPath}/${filename}`;

    // Export to CSV
    const result = await this.csvExportService.exportToCsv(
      entityType,
      filePath,
      {
        status,
      },
    );

    if (!result.success) {
      throw new InternalServerErrorException(
        `CSV export failed: ${result.errorMessage}`,
      );
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException(
        `Export file not found: ${filePath}`,
      );
    }

    // Set response headers for file download
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entityType}.csv"`,
      'X-Record-Count': result.recordCount.toString(),
    });

    // Stream file to response
    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream);
  }

  /**
   * Delta export - Export only records modified since a specific date
   *
   * Implements OneRoster Delta/Incremental sync pattern.
   *
   * @param entityType - Entity type
   * @param since - ISO 8601 date (e.g., 2025-01-01T00:00:00Z)
   * @param status - Filter by status
   * @param res - Express response object
   * @returns CSV file stream with delta records
   */
  @Get(':entityType/delta')
  @ApiOperation({
    summary: 'Delta export - Export records modified since date',
  })
  @ApiQuery({
    name: 'since',
    required: true,
    type: String,
    description: 'ISO 8601 date (e.g., 2025-01-01T00:00:00Z)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'tobedeleted'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delta CSV file generated successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters',
  })
  async exportDeltaCsv(
    @Param('entityType') entityType: string,
    @Query('since') since: string,
    @Res({ passthrough: true }) res: Response,
    @Query('status') status?: string,
  ): Promise<StreamableFile> {
    // Validate entity type
    const validEntityTypes = [
      'users',
      'orgs',
      'classes',
      'courses',
      'enrollments',
      'academicSessions',
      'demographics',
    ];

    if (!validEntityTypes.includes(entityType)) {
      throw new BadRequestException(
        `Invalid entity type: ${entityType}. Must be one of: ${validEntityTypes.join(', ')}`,
      );
    }

    // Validate and parse since date
    if (!since) {
      throw new BadRequestException('Missing required parameter: since');
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      throw new BadRequestException(
        `Invalid date format for 'since': ${since}. Expected ISO 8601 format.`,
      );
    }

    // Generate unique filename
    const filename = `${entityType}-delta-${sinceDate.toISOString().split('T')[0]}-${uuidv4()}.csv`;
    const filePath = `${this.exportPath}/${filename}`;

    // Export delta CSV
    const result = await this.csvExportService.exportToCsv(
      entityType,
      filePath,
      {
        since: sinceDate,
        status,
      },
    );

    if (!result.success) {
      throw new InternalServerErrorException(
        `Delta CSV export failed: ${result.errorMessage}`,
      );
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException(
        `Export file not found: ${filePath}`,
      );
    }

    // Set response headers
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entityType}-delta.csv"`,
      'X-Record-Count': result.recordCount.toString(),
      'X-Delta-Since': sinceDate.toISOString(),
    });

    // Stream file to response
    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream);
  }
}
