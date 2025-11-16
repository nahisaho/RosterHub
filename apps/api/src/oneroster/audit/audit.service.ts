import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository, AuditLogFilterOptions } from './repositories/audit-log.repository';
import { AuditLog, AuditAction } from '@prisma/client';

/**
 * Audit Service
 *
 * Business logic layer for audit logging operations.
 * Provides analytics, data retention, and audit trail management.
 *
 * Features:
 * - Query audit logs with advanced filtering
 * - Audit trail analytics and statistics
 * - Data retention policy enforcement
 * - Compliance reporting (GDPR, 個人情報保護法)
 *
 * Requirements Coverage:
 * - FR-AUDIT-001: Comprehensive audit logging
 * - FR-AUDIT-002: Change tracking
 * - NFR-COMP-001: GDPR compliance (data access logging)
 * - NFR-COMP-002: 個人情報保護法 compliance
 *
 * @class
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Find all audit logs with filtering
   *
   * @param options - Filter options
   * @returns Array of audit logs
   */
  async findAll(options: AuditLogFilterOptions = {}): Promise<AuditLog[]> {
    return this.auditLogRepository.findAll(options);
  }

  /**
   * Find audit log by ID
   *
   * @param id - Audit log UUID
   * @returns AuditLog or null
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findById(id);
  }

  /**
   * Find audit logs for a specific entity
   *
   * Useful for tracking all operations on a specific user, org, class, etc.
   *
   * @param entityType - Entity type (e.g., "User", "Org")
   * @param entitySourcedId - Entity sourcedId
   * @param options - Pagination options
   * @returns Audit logs for entity
   */
  async findByEntity(
    entityType: string,
    entitySourcedId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntity(entityType, entitySourcedId, options);
  }

  /**
   * Find audit logs by API key
   *
   * Useful for tracking all operations performed with a specific API key.
   *
   * @param apiKeyId - API key UUID
   * @param options - Pagination options
   * @returns Audit logs for API key
   */
  async findByApiKey(
    apiKeyId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByApiKey(apiKeyId, options);
  }

  /**
   * Find audit logs by action type
   *
   * @param action - AuditAction (CREATE, UPDATE, DELETE, READ)
   * @param options - Pagination options
   * @returns Audit logs with specified action
   */
  async findByAction(
    action: AuditAction,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByAction(action, options);
  }

  /**
   * Find audit logs by IP address
   *
   * Useful for security investigation and compliance.
   *
   * @param ipAddress - IP address
   * @param options - Pagination options
   * @returns Audit logs from IP address
   */
  async findByIpAddress(
    ipAddress: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByIpAddress(ipAddress, options);
  }

  /**
   * Find audit logs within time range
   *
   * @param from - Start timestamp
   * @param to - End timestamp
   * @param options - Pagination options
   * @returns Audit logs in time range
   */
  async findByTimeRange(
    from: Date,
    to: Date,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByTimeRange(from, to, options);
  }

  /**
   * Get audit statistics for a time period
   *
   * Provides aggregated analytics on audit logs:
   * - Total count
   * - Distribution by action type (CREATE, UPDATE, DELETE, READ)
   * - Distribution by entity type (User, Org, Class, etc.)
   *
   * Useful for:
   * - Compliance reporting
   * - Security monitoring
   * - Usage analytics
   *
   * @param from - Start timestamp
   * @param to - End timestamp
   * @returns Aggregated statistics
   */
  async getStatistics(from: Date, to: Date) {
    return this.auditLogRepository.getStatistics(from, to);
  }

  /**
   * Count audit logs matching criteria
   *
   * @param options - Filter options
   * @returns Count of matching audit logs
   */
  async count(options: AuditLogFilterOptions = {}): Promise<number> {
    const where: any = {
      ...(options.action && { action: options.action }),
      ...(options.entityType && { entityType: options.entityType }),
      ...(options.entitySourcedId && { entitySourcedId: options.entitySourcedId }),
      ...(options.userId && { userId: options.userId }),
      ...(options.apiKeyId && { apiKeyId: options.apiKeyId }),
      ...(options.ipAddress && { ipAddress: options.ipAddress }),
      ...(options.timestampFrom && {
        timestamp: {
          gte: options.timestampFrom,
        },
      }),
      ...(options.timestampTo && {
        timestamp: {
          lte: options.timestampTo,
        },
      }),
    };

    return this.auditLogRepository.count(where);
  }

  /**
   * Enforce data retention policy
   *
   * Deletes audit logs older than the retention period.
   * Default retention: 2 years (GDPR requirement for educational data in Japan).
   *
   * Should be run as a scheduled job (cron):
   * - Daily at 3 AM: Delete logs older than 2 years
   *
   * @param retentionDays - Number of days to retain (default: 730 days = 2 years)
   * @returns Number of deleted records
   */
  async enforceDataRetention(retentionDays: number = 730): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.logger.log(
      `Enforcing data retention policy: Deleting audit logs older than ${cutoffDate.toISOString()}`,
    );

    const deletedCount = await this.auditLogRepository.deleteOldLogs(cutoffDate);

    this.logger.log(`Deleted ${deletedCount} old audit logs`);

    return deletedCount;
  }

  /**
   * Generate GDPR compliance report for a user
   *
   * Returns all audit logs related to a specific user's data access.
   * Required for GDPR Article 15 (Right of Access).
   *
   * @param userId - User sourcedId
   * @param from - Start date (optional)
   * @param to - End date (optional)
   * @returns Audit logs for user
   */
  async generateGdprReport(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<{
    userId: string;
    totalAccesses: number;
    accesses: AuditLog[];
    reportGeneratedAt: Date;
  }> {
    const options: AuditLogFilterOptions = {
      userId,
      ...(from && { timestampFrom: from }),
      ...(to && { timestampTo: to }),
      orderBy: '-timestamp',
    };

    const accesses = await this.findAll(options);
    const totalAccesses = await this.count(options);

    return {
      userId,
      totalAccesses,
      accesses,
      reportGeneratedAt: new Date(),
    };
  }

  /**
   * Detect suspicious activity
   *
   * Identifies potentially suspicious patterns in audit logs:
   * - High volume of requests from single IP (potential DoS)
   * - High volume of failed requests (potential brute force)
   * - Unusual access patterns (e.g., access from multiple IPs in short time)
   *
   * @param timeWindowMinutes - Time window to analyze (default: 60 minutes)
   * @returns Suspicious activity report
   */
  async detectSuspiciousActivity(timeWindowMinutes: number = 60): Promise<{
    highVolumeIps: { ipAddress: string; count: number }[];
    highFailureRates: { apiKeyId: string; successRate: number }[];
    analysisTime: Date;
  }> {
    const from = new Date();
    from.setMinutes(from.getMinutes() - timeWindowMinutes);
    const to = new Date();

    // This would require custom SQL queries for complex analysis
    // For now, return placeholder structure
    // TODO: Implement with Prisma aggregations or raw SQL

    this.logger.log(
      `Analyzing suspicious activity from ${from.toISOString()} to ${to.toISOString()}`,
    );

    return {
      highVolumeIps: [],
      highFailureRates: [],
      analysisTime: new Date(),
    };
  }
}
