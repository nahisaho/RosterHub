import { PrismaService } from './prisma.service';

/**
 * Base Repository Interface
 *
 * Defines common CRUD operations for OneRoster entities.
 */
export interface IBaseRepository<T> {
  findAll(filter?: any): Promise<T[]>;
  findBySourcedId(sourcedId: string): Promise<T | null>;
  create(data: any): Promise<T>;
  update(sourcedId: string, data: any): Promise<T>;
  softDelete(sourcedId: string): Promise<T>;
  count(filter?: any): Promise<number>;
}

/**
 * Base Repository Abstract Class
 *
 * Provides common repository operations for all OneRoster entities.
 * All entity repositories should extend this class.
 *
 * @template T - Entity type (Prisma model)
 *
 * @example
 * ```typescript
 * export class UserRepository extends BaseRepository<User> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'user');
 *   }
 *
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.prisma.user.findUnique({ where: { email } });
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  /**
   * Get Prisma model instance
   */
  protected get model() {
    // @ts-expect-error - Dynamic model access
    return this.prisma[this.modelName];
  }

  /**
   * Find all records with optional filtering, pagination, and sorting
   *
   * @param filter - Query options (where, skip, take, orderBy)
   * @returns Array of entities
   */
  async findAll(filter?: any): Promise<T[]> {
    return await this.model.findMany(filter);
  }

  /**
   * Find record by OneRoster sourcedId (unique identifier)
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns Entity or null if not found
   */
  async findBySourcedId(sourcedId: string): Promise<T | null> {
    return await this.model.findUnique({
      where: { sourcedId },
    });
  }

  /**
   * Create a new record
   *
   * @param data - Entity data (without sourcedId, dateCreated, dateLastModified)
   * @returns Created entity
   */
  async create(data: any): Promise<T> {
    return await this.model.create({
      data: {
        ...data,
        dateCreated: new Date(),
        dateLastModified: new Date(),
      },
    });
  }

  /**
   * Update record by sourcedId
   *
   * @param sourcedId - OneRoster sourcedId
   * @param data - Partial entity data to update
   * @returns Updated entity
   */
  async update(sourcedId: string, data: any): Promise<T> {
    return await this.model.update({
      where: { sourcedId },
      data: {
        ...data,
        dateLastModified: new Date(),
      },
    });
  }

  /**
   * Soft delete record by setting status to 'tobedeleted'
   * (OneRoster specification: no physical deletes)
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns Updated entity with status 'tobedeleted'
   */
  async softDelete(sourcedId: string): Promise<T> {
    return await this.model.update({
      where: { sourcedId },
      data: {
        status: 'tobedeleted',
        dateLastModified: new Date(),
      },
    });
  }

  /**
   * Count records with optional filtering
   *
   * @param filter - Where clause for filtering
   * @returns Number of matching records
   */
  async count(filter?: any): Promise<number> {
    return await this.model.count(filter);
  }

  /**
   * Build Prisma where clause for Delta API (dateLastModified filter)
   *
   * @param dateLastModified - ISO 8601 date string (e.g., "2025-01-01T00:00:00Z")
   * @returns Prisma where clause with dateLastModified filter
   */
  protected buildDeltaWhereClause(dateLastModified?: string) {
    if (!dateLastModified) {
      return {};
    }

    return {
      dateLastModified: {
        gte: new Date(dateLastModified),
      },
    };
  }

  /**
   * Build pagination options (skip, take)
   *
   * @param offset - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Prisma pagination object
   */
  protected buildPaginationOptions(offset: number = 0, limit: number = 100) {
    return {
      skip: offset,
      take: Math.min(limit, 1000), // Max 1000 records per request
    };
  }

  /**
   * Build order by clause
   *
   * @param orderBy - Sort field and direction (e.g., "dateCreated:desc")
   * @returns Prisma orderBy object
   */
  protected buildOrderByClause(orderBy?: string) {
    if (!orderBy) {
      return { dateCreated: 'desc' };
    }

    // Handle both formats: "-field" (descending) or "field" (ascending) or "field:desc"
    if (orderBy.startsWith('-')) {
      const field = orderBy.substring(1);
      return { [field]: 'desc' };
    }

    if (orderBy.includes(':')) {
      const [field, direction] = orderBy.split(':');
      return { [field]: direction === 'asc' ? 'asc' : 'desc' };
    }

    // Default: ascending order
    return { [orderBy]: 'asc' };
  }
}
