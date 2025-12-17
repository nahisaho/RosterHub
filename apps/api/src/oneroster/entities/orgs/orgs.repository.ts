import { Injectable } from '@nestjs/common';
import { Org, OrgType, StatusType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

/**
 * Org Filter Options
 */
export interface OrgFilterOptions {
  dateLastModified?: string;
  status?: StatusType;
  type?: OrgType;
  parentSourcedId?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * Organization Repository
 *
 * Handles all database operations for Org entity.
 * Supports hierarchical organization structure (parent-child relationships).
 */
@Injectable()
export class OrgsRepository extends BaseRepository<Org> {
  constructor(prisma: PrismaService) {
    super(prisma, 'org');
  }

  /**
   * Find organizations with filtering, pagination, and sorting
   *
   * @param options - Filter options (Delta API, status, type, parent, pagination)
   * @returns Array of orgs matching filter criteria
   */
  async findAllWithFilter(options: OrgFilterOptions = {}): Promise<Org[]> {
    const {
      dateLastModified,
      status,
      type,
      parentSourcedId,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.OrgWhereInput = {
      ...this.buildDeltaWhereClause(dateLastModified),
      ...(status && { status }),
      ...(type && { type }),
      ...(parentSourcedId !== undefined && { parentSourcedId }),
    };

    return this.findAll({
      where: whereClause,
      ...this.buildPaginationOptions(offset, limit),
      orderBy: this.buildOrderByClause(orderBy),
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * Find organization by sourcedId with relationships
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns Org with parent, children, and members
   */
  async findBySourcedIdWithRelations(sourcedId: string): Promise<Org | null> {
    return this.prisma.org.findUnique({
      where: { sourcedId },
      include: {
        parent: true,
        children: true,
        members: {
          include: {
            user: true,
          },
        },
        classes: true,
        courses: true,
      },
    });
  }

  /**
   * Find organization by identifier (unique external ID)
   *
   * @param identifier - OneRoster identifier
   * @returns Org or null if not found
   */
  async findByIdentifier(identifier: string): Promise<Org | null> {
    return this.prisma.org.findUnique({
      where: { identifier },
    });
  }

  /**
   * Find organizations by type
   *
   * @param type - OrgType (school, district, department, etc.)
   * @param options - Pagination options
   * @returns Orgs with specified type
   */
  async findByType(
    type: OrgType,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Org[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { type },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find child organizations
   *
   * @param parentSourcedId - Parent organization sourcedId
   * @param options - Pagination options
   * @returns Child organizations
   */
  async findChildren(
    parentSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Org[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { parentSourcedId },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find root organizations (organizations without parent)
   *
   * @param options - Pagination options
   * @returns Root organizations
   */
  async findRoots(
    options: { offset?: number; limit?: number } = {},
  ): Promise<Org[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { parentSourcedId: null },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find all ancestors of an organization (recursive query)
   *
   * @param sourcedId - Organization sourcedId
   * @returns Array of ancestor organizations (from direct parent to root)
   */
  async findAncestors(sourcedId: string): Promise<Org[]> {
    const ancestors: Org[] = [];
    let currentOrg = await this.findBySourcedId(sourcedId);

    while (currentOrg?.parentSourcedId) {
      const parent = await this.findBySourcedId(currentOrg.parentSourcedId);
      if (!parent) break;
      ancestors.push(parent);
      currentOrg = parent;
    }

    return ancestors;
  }

  /**
   * Find all descendants of an organization (recursive query)
   *
   * @param sourcedId - Organization sourcedId
   * @returns Array of descendant organizations (all levels)
   */
  async findDescendants(sourcedId: string): Promise<Org[]> {
    const descendants: Org[] = [];
    const queue: string[] = [sourcedId];

    while (queue.length > 0) {
      const currentSourcedId = queue.shift()!;
      const children = await this.findChildren(currentSourcedId);

      descendants.push(...children);
      queue.push(...children.map((child) => child.sourcedId));
    }

    return descendants;
  }

  /**
   * Count organizations by type
   *
   * @param type - OrgType
   * @returns Number of orgs with specified type
   */
  async countByType(type: OrgType): Promise<number> {
    return this.count({ where: { type } });
  }

  /**
   * Check if organization exists by identifier
   *
   * @param identifier - OneRoster identifier
   * @returns True if org exists, false otherwise
   */
  async existsByIdentifier(identifier: string): Promise<boolean> {
    const count = await this.prisma.org.count({
      where: { identifier },
    });
    return count > 0;
  }

  /**
   * Check if organization has children
   *
   * @param sourcedId - Organization sourcedId
   * @returns True if org has children, false otherwise
   */
  async hasChildren(sourcedId: string): Promise<boolean> {
    const count = await this.prisma.org.count({
      where: { parentSourcedId: sourcedId },
    });
    return count > 0;
  }
}
