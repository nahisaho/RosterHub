import { Injectable } from '@nestjs/common';
import { AuditLog, AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * AuditLog Filter Options
 */
export interface AuditLogFilterOptions {
  action?: AuditAction;
  entityType?: string;
  entitySourcedId?: string;
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  timestampFrom?: Date;
  timestampTo?: Date;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * AuditLog Repository
 *
 * Handles all database operations for AuditLog entity.
 * Audit logs track all data access and modification operations.
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all audit logs with optional filtering
   *
   * @param options - Filter options
   * @returns Array of audit logs
   */
  async findAll(options: AuditLogFilterOptions = {}): Promise<AuditLog[]> {
    const {
      action,
      entityType,
      entitySourcedId,
      userId,
      apiKeyId,
      ipAddress,
      timestampFrom,
      timestampTo,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.AuditLogWhereInput = {
      ...(action && { action }),
      ...(entityType && { entityType }),
      ...(entitySourcedId && { entitySourcedId }),
      ...(userId && { userId }),
      ...(apiKeyId && { apiKeyId }),
      ...(ipAddress && { ipAddress }),
      ...(timestampFrom && {
        timestamp: {
          gte: timestampFrom,
        },
      }),
      ...(timestampTo && {
        timestamp: {
          lte: timestampTo,
        },
      }),
    };

    return this.prisma.auditLog.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: this.buildOrderByClause(orderBy),
      include: {
        apiKey: true,
      },
    });
  }

  /**
   * Find audit log by ID
   *
   * @param id - Audit log UUID
   * @returns AuditLog or null if not found
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        apiKey: true,
      },
    });
  }

  /**
   * Find audit logs by entity
   *
   * @param entityType - Entity type (e.g., "User", "Org")
   * @param entitySourcedId - Entity sourcedId
   * @param options - Pagination options
   * @returns Audit logs for specified entity
   */
  async findByEntity(
    entityType: string,
    entitySourcedId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entitySourcedId,
      },
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        apiKey: true,
      },
    });
  }

  /**
   * Find audit logs by user
   *
   * @param userId - User ID or sourcedId
   * @param options - Pagination options
   * @returns Audit logs for specified user
   */
  async findByUser(
    userId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.auditLog.findMany({
      where: { userId },
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Find audit logs by API key
   *
   * @param apiKeyId - API key UUID
   * @param options - Pagination options
   * @returns Audit logs for specified API key
   */
  async findByApiKey(
    apiKeyId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.auditLog.findMany({
      where: { apiKeyId },
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        apiKey: true,
      },
    });
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
    const { offset = 0, limit = 100 } = options;

    return this.prisma.auditLog.findMany({
      where: { action },
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Find audit logs by IP address
   *
   * @param ipAddress - IP address
   * @param options - Pagination options
   * @returns Audit logs from specified IP
   */
  async findByIpAddress(
    ipAddress: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.auditLog.findMany({
      where: { ipAddress },
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Find audit logs within time range
   *
   * @param from - Start timestamp
   * @param to - End timestamp
   * @param options - Pagination options
   * @returns Audit logs within specified time range
   */
  async findByTimeRange(
    from: Date,
    to: Date,
    options: { offset?: number; limit?: number } = {}
  ): Promise<AuditLog[]> {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Create a new audit log entry
   *
   * @param data - Audit log creation data
   * @returns Created audit log
   */
  async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data,
    });
  }

  /**
   * Bulk create audit log entries
   *
   * @param data - Array of audit log creation data
   * @returns Number of created records
   */
  async createMany(data: Prisma.AuditLogCreateManyInput[]): Promise<number> {
    const result = await this.prisma.auditLog.createMany({
      data,
    });
    return result.count;
  }

  /**
   * Delete old audit logs (data retention)
   *
   * @param olderThan - Delete logs older than this date
   * @returns Number of deleted records
   */
  async deleteOldLogs(olderThan: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: olderThan,
        },
      },
    });
    return result.count;
  }

  /**
   * Count audit logs
   *
   * @param where - Where clause
   * @returns Number of audit logs matching criteria
   */
  async count(where?: Prisma.AuditLogWhereInput): Promise<number> {
    return this.prisma.auditLog.count({ where });
  }

  /**
   * Count audit logs by action type
   *
   * @param action - AuditAction
   * @returns Number of logs with specified action
   */
  async countByAction(action: AuditAction): Promise<number> {
    return this.count({ action });
  }

  /**
   * Count audit logs by entity
   *
   * @param entityType - Entity type
   * @param entitySourcedId - Entity sourcedId
   * @returns Number of logs for specified entity
   */
  async countByEntity(entityType: string, entitySourcedId: string): Promise<number> {
    return this.count({
      entityType,
      entitySourcedId,
    });
  }

  /**
   * Get audit statistics for a time period
   *
   * @param from - Start timestamp
   * @param to - End timestamp
   * @returns Aggregated statistics
   */
  async getStatistics(from: Date, to: Date) {
    const [totalCount, actionDistribution, entityTypeDistribution] = await Promise.all([
      this.count({
        timestamp: {
          gte: from,
          lte: to,
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          timestamp: {
            gte: from,
            lte: to,
          },
        },
        _count: {
          action: true,
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where: {
          timestamp: {
            gte: from,
            lte: to,
          },
        },
        _count: {
          entityType: true,
        },
      }),
    ]);

    return {
      totalCount,
      actionDistribution: actionDistribution.map((item) => ({
        action: item.action,
        count: item._count.action,
      })),
      entityTypeDistribution: entityTypeDistribution.map((item) => ({
        entityType: item.entityType,
        count: item._count.entityType,
      })),
    };
  }

  /**
   * Build order by clause from string
   *
   * @param orderBy - Order by string (e.g., "timestamp" or "-timestamp" for desc)
   * @returns Prisma order by clause
   */
  private buildOrderByClause(orderBy?: string): Prisma.AuditLogOrderByWithRelationInput {
    if (!orderBy) {
      return { timestamp: 'desc' };
    }

    const descending = orderBy.startsWith('-');
    const field = descending ? orderBy.slice(1) : orderBy;

    return {
      [field]: descending ? 'desc' : 'asc',
    };
  }
}
