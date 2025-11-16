import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { AuditAction } from '@prisma/client';

/**
 * Audit Controller
 *
 * Provides API endpoints for querying and managing audit logs.
 * Protected by API Key authentication, IP whitelist, and rate limiting.
 *
 * Endpoints:
 * - GET /api/v1/audit - Query audit logs with filtering
 * - GET /api/v1/audit/:id - Get specific audit log by ID
 * - GET /api/v1/audit/entity/:entityType/:sourcedId - Get audit logs for entity
 * - GET /api/v1/audit/statistics - Get audit statistics
 * - GET /api/v1/audit/gdpr/:userId - Generate GDPR compliance report
 * - DELETE /api/v1/audit/retention - Enforce data retention policy (admin only)
 *
 * Requirements Coverage:
 * - FR-AUDIT-001: Audit log querying API
 * - NFR-COMP-001: GDPR compliance (audit trail access)
 * - NFR-SEC-001: Secure access to audit logs
 *
 * @controller
 */
@ApiTags('Audit')
@Controller('api/v1/audit')
@UseGuards(ApiKeyGuard, IpWhitelistGuard, RateLimitGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Query audit logs with filtering
   *
   * Supports filtering by:
   * - action (CREATE, UPDATE, DELETE, READ)
   * - entityType (User, Org, Class, etc.)
   * - entitySourcedId
   * - apiKeyId
   * - ipAddress
   * - Time range (timestampFrom, timestampTo)
   *
   * @param action - Filter by action type
   * @param entityType - Filter by entity type
   * @param entitySourcedId - Filter by entity sourcedId
   * @param apiKeyId - Filter by API key ID
   * @param ipAddress - Filter by IP address
   * @param timestampFrom - Filter by start timestamp (ISO 8601)
   * @param timestampTo - Filter by end timestamp (ISO 8601)
   * @param offset - Pagination offset (default: 0)
   * @param limit - Pagination limit (default: 100, max: 1000)
   * @param orderBy - Order by field (e.g., "timestamp" or "-timestamp" for desc)
   * @returns Array of audit logs
   */
  @Get()
  @ApiOperation({ summary: 'Query audit logs with filtering' })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entitySourcedId', required: false, type: String })
  @ApiQuery({ name: 'apiKeyId', required: false, type: String })
  @ApiQuery({ name: 'ipAddress', required: false, type: String })
  @ApiQuery({ name: 'timestampFrom', required: false, type: String })
  @ApiQuery({ name: 'timestampTo', required: false, type: String })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit logs retrieved successfully',
  })
  async findAll(
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('entitySourcedId') entitySourcedId?: string,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('timestampFrom') timestampFrom?: string,
    @Query('timestampTo') timestampTo?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    const options = {
      action,
      entityType,
      entitySourcedId,
      apiKeyId,
      ipAddress,
      timestampFrom: timestampFrom ? new Date(timestampFrom) : undefined,
      timestampTo: timestampTo ? new Date(timestampTo) : undefined,
      offset: offset ? parseInt(offset, 10) : 0,
      limit: Math.min(limit ? parseInt(limit, 10) : 100, 1000), // Max 1000
      orderBy,
    };

    const auditLogs = await this.auditService.findAll(options);
    const totalCount = await this.auditService.count(options);

    return {
      data: auditLogs,
      pagination: {
        offset: options.offset,
        limit: options.limit,
        total: totalCount,
      },
    };
  }

  /**
   * Get specific audit log by ID
   *
   * @param id - Audit log UUID
   * @returns Audit log or 404 if not found
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit log retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Audit log not found',
  })
  async findOne(@Param('id') id: string) {
    const auditLog = await this.auditService.findById(id);

    if (!auditLog) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Audit log not found',
      };
    }

    return {
      data: auditLog,
    };
  }

  /**
   * Get audit logs for a specific entity
   *
   * Returns all operations (CREATE, UPDATE, DELETE, READ) performed on an entity.
   *
   * @param entityType - Entity type (User, Org, Class, etc.)
   * @param sourcedId - Entity sourcedId
   * @param offset - Pagination offset
   * @param limit - Pagination limit
   * @returns Audit logs for entity
   */
  @Get('entity/:entityType/:sourcedId')
  @ApiOperation({ summary: 'Get audit logs for specific entity' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entity audit logs retrieved successfully',
  })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('sourcedId') sourcedId: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const options = {
      offset: offset ? parseInt(offset, 10) : 0,
      limit: Math.min(limit ? parseInt(limit, 10) : 100, 1000),
    };

    const auditLogs = await this.auditService.findByEntity(entityType, sourcedId, options);

    return {
      data: auditLogs,
      pagination: {
        offset: options.offset,
        limit: options.limit,
      },
    };
  }

  /**
   * Get audit statistics for a time period
   *
   * Returns aggregated statistics:
   * - Total count
   * - Distribution by action type
   * - Distribution by entity type
   *
   * @param from - Start timestamp (ISO 8601)
   * @param to - End timestamp (ISO 8601)
   * @returns Audit statistics
   */
  @Get('statistics/summary')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit statistics retrieved successfully',
  })
  async getStatistics(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const statistics = await this.auditService.getStatistics(fromDate, toDate);

    return {
      data: statistics,
      timeRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    };
  }

  /**
   * Generate GDPR compliance report for a user
   *
   * Returns all data access logs for a specific user.
   * Required for GDPR Article 15 (Right of Access).
   *
   * @param userId - User sourcedId
   * @param from - Start date (optional)
   * @param to - End date (optional)
   * @returns GDPR compliance report
   */
  @Get('gdpr/:userId')
  @ApiOperation({ summary: 'Generate GDPR compliance report for user' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'GDPR report generated successfully',
  })
  async generateGdprReport(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const report = await this.auditService.generateGdprReport(userId, fromDate, toDate);

    return {
      data: report,
    };
  }

  /**
   * Enforce data retention policy
   *
   * Deletes audit logs older than the retention period.
   * Default: 730 days (2 years).
   *
   * ⚠️ ADMIN ONLY: This endpoint should be protected by additional authorization.
   * For now, it requires API key authentication.
   *
   * @param retentionDays - Number of days to retain (default: 730)
   * @returns Number of deleted records
   */
  @Delete('retention')
  @ApiOperation({ summary: 'Enforce data retention policy (ADMIN)' })
  @ApiQuery({ name: 'retentionDays', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data retention policy enforced successfully',
  })
  async enforceDataRetention(@Query('retentionDays') retentionDays?: string) {
    const days = retentionDays ? parseInt(retentionDays, 10) : 730;
    const deletedCount = await this.auditService.enforceDataRetention(days);

    return {
      message: 'Data retention policy enforced successfully',
      deletedCount,
      retentionDays: days,
    };
  }
}
