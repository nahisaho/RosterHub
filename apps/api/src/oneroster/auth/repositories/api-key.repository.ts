import { Injectable } from '@nestjs/common';
import { ApiKey, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * ApiKey Filter Options
 */
export interface ApiKeyFilterOptions {
  isActive?: boolean;
  organizationId?: string;
  name?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * ApiKey Repository
 *
 * Handles all database operations for ApiKey entity.
 * API Keys are used for authentication and authorization.
 */
@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all API keys with optional filtering
   *
   * @param options - Filter options
   * @returns Array of API keys
   */
  async findAll(options: ApiKeyFilterOptions = {}): Promise<ApiKey[]> {
    const { isActive, organizationId, name, offset = 0, limit = 100, orderBy } = options;

    const whereClause: Prisma.ApiKeyWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(organizationId && { organizationId }),
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
    };

    return this.prisma.apiKey.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: this.buildOrderByClause(orderBy),
    });
  }

  /**
   * Find API key by ID
   *
   * @param id - API key UUID
   * @returns ApiKey or null if not found
   */
  async findById(id: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { id },
    });
  }

  /**
   * Find API key by key string
   *
   * @param key - API key string
   * @returns ApiKey or null if not found
   */
  async findByKey(key: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { key },
    });
  }

  /**
   * Find active API key by key string
   *
   * @param key - API key string
   * @returns ApiKey or null if not found or inactive
   */
  async findActiveByKey(key: string): Promise<ApiKey | null> {
    const now = new Date();

    return this.prisma.apiKey.findFirst({
      where: {
        key,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  /**
   * Find all active API keys
   *
   * @returns Array of active API keys
   */
  async findAllActive(): Promise<ApiKey[]> {
    const now = new Date();

    return this.prisma.apiKey.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  /**
   * Find API keys by organization
   *
   * @param organizationId - Organization ID
   * @param options - Pagination options
   * @returns API keys for specified organization
   */
  async findByOrganization(
    organizationId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<ApiKey[]> {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.apiKey.findMany({
      where: { organizationId },
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Create a new API key
   *
   * @param data - API key creation data
   * @returns Created API key
   */
  async create(data: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
    return this.prisma.apiKey.create({
      data,
    });
  }

  /**
   * Update API key
   *
   * @param id - API key UUID
   * @param data - Update data
   * @returns Updated API key
   */
  async update(id: string, data: Prisma.ApiKeyUpdateInput): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data,
    });
  }

  /**
   * Update last used timestamp
   *
   * @param id - API key UUID
   * @returns Updated API key
   */
  async updateLastUsed(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Activate API key
   *
   * @param id - API key UUID
   * @returns Updated API key
   */
  async activate(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        isActive: true,
      },
    });
  }

  /**
   * Deactivate API key
   *
   * @param id - API key UUID
   * @returns Updated API key
   */
  async deactivate(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Revoke API key (alias for deactivate)
   *
   * @param id - API key UUID
   * @returns Updated API key
   */
  async revoke(id: string): Promise<ApiKey> {
    return this.deactivate(id);
  }

  /**
   * Delete API key
   *
   * @param id - API key UUID
   * @returns Deleted API key
   */
  async delete(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.delete({
      where: { id },
    });
  }

  /**
   * Count API keys
   *
   * @param where - Where clause
   * @returns Number of API keys matching criteria
   */
  async count(where?: Prisma.ApiKeyWhereInput): Promise<number> {
    return this.prisma.apiKey.count({ where });
  }

  /**
   * Count active API keys by organization
   *
   * @param organizationId - Organization ID
   * @returns Number of active API keys
   */
  async countActiveByOrganization(organizationId: string): Promise<number> {
    return this.count({
      organizationId,
      isActive: true,
    });
  }

  /**
   * Check if API key exists
   *
   * @param key - API key string
   * @returns True if key exists, false otherwise
   */
  async existsByKey(key: string): Promise<boolean> {
    const count = await this.prisma.apiKey.count({
      where: { key },
    });
    return count > 0;
  }

  /**
   * Find expired API keys
   *
   * @param options - Pagination options
   * @returns Expired API keys
   */
  async findExpired(options: { offset?: number; limit?: number } = {}): Promise<ApiKey[]> {
    const { offset = 0, limit = 100 } = options;
    const now = new Date();

    return this.prisma.apiKey.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        expiresAt: 'asc',
      },
    });
  }

  /**
   * Validate IP address against whitelist
   *
   * @param key - API key string
   * @param ipAddress - Client IP address
   * @returns True if IP is whitelisted or no whitelist exists, false otherwise
   */
  async isIpWhitelisted(key: string, ipAddress: string): Promise<boolean> {
    const apiKey = await this.findByKey(key);

    if (!apiKey) {
      return false;
    }

    // If no whitelist, allow all IPs
    if (!apiKey.ipWhitelist || apiKey.ipWhitelist.length === 0) {
      return true;
    }

    // Check if IP is in whitelist
    return apiKey.ipWhitelist.includes(ipAddress);
  }

  /**
   * Build order by clause from string
   *
   * @param orderBy - Order by string (e.g., "createdAt" or "-createdAt" for desc)
   * @returns Prisma order by clause
   */
  private buildOrderByClause(orderBy?: string): Prisma.ApiKeyOrderByWithRelationInput {
    if (!orderBy) {
      return { createdAt: 'desc' };
    }

    const descending = orderBy.startsWith('-');
    const field = descending ? orderBy.slice(1) : orderBy;

    return {
      [field]: descending ? 'desc' : 'asc',
    };
  }
}
