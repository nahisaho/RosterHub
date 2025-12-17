import { Injectable } from '@nestjs/common';
import {
  AcademicSession,
  AcademicSessionType,
  StatusType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

/**
 * AcademicSession Filter Options
 */
export interface AcademicSessionFilterOptions {
  dateLastModified?: string;
  status?: StatusType;
  type?: AcademicSessionType;
  schoolYear?: string;
  parentSourcedId?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * AcademicSession Repository
 *
 * Handles all database operations for AcademicSession entity.
 * Academic Sessions represent terms, semesters, and school years.
 * Supports hierarchical structure (e.g., school year > semester > term).
 * OneRoster Specification: Section 4.8 Academic Sessions
 */
@Injectable()
export class AcademicSessionsRepository extends BaseRepository<AcademicSession> {
  constructor(prisma: PrismaService) {
    super(prisma, 'academicSession');
  }

  /**
   * Find academic sessions with filtering, pagination, and sorting
   *
   * @param options - Filter options (Delta API, status, type, schoolYear, parent, pagination)
   * @returns Array of academic sessions matching filter criteria
   */
  async findAllWithFilter(
    options: AcademicSessionFilterOptions = {},
  ): Promise<AcademicSession[]> {
    const {
      dateLastModified,
      status,
      type,
      schoolYear,
      parentSourcedId,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.AcademicSessionWhereInput = {
      ...this.buildDeltaWhereClause(dateLastModified),
      ...(status && { status }),
      ...(type && { type }),
      ...(schoolYear && { schoolYear }),
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
   * Find academic session by sourcedId with relationships
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns AcademicSession with parent, children, and classes
   */
  async findBySourcedIdWithRelations(
    sourcedId: string,
  ): Promise<AcademicSession | null> {
    return this.prisma.academicSession.findUnique({
      where: { sourcedId },
      include: {
        parent: true,
        children: true,
        classes: {
          include: {
            class: {
              include: {
                course: true,
                school: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find academic sessions by type
   *
   * @param type - AcademicSessionType (schoolYear, semester, term, gradingPeriod)
   * @param options - Pagination options
   * @returns Academic sessions with specified type
   */
  async findByType(
    type: AcademicSessionType,
    options: { offset?: number; limit?: number } = {},
  ): Promise<AcademicSession[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { type },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find academic sessions by school year
   *
   * @param schoolYear - School year (e.g., "2024")
   * @param options - Pagination options
   * @returns Academic sessions for specified school year
   */
  async findBySchoolYear(
    schoolYear: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<AcademicSession[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { schoolYear },
      ...this.buildPaginationOptions(offset, limit),
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Find child academic sessions
   *
   * @param parentSourcedId - Parent academic session sourcedId
   * @param options - Pagination options
   * @returns Child academic sessions
   */
  async findChildren(
    parentSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<AcademicSession[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { parentSourcedId },
      ...this.buildPaginationOptions(offset, limit),
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Find root academic sessions (sessions without parent)
   *
   * @param options - Pagination options
   * @returns Root academic sessions
   */
  async findRoots(
    options: { offset?: number; limit?: number } = {},
  ): Promise<AcademicSession[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { parentSourcedId: null },
      ...this.buildPaginationOptions(offset, limit),
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  /**
   * Find active academic sessions on a specific date
   *
   * @param date - Reference date (default: now)
   * @param options - Pagination options
   * @returns Academic sessions active on specified date
   */
  async findActive(
    date: Date = new Date(),
    options: { offset?: number; limit?: number } = {},
  ): Promise<AcademicSession[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: {
        status: 'active',
        startDate: {
          lte: date,
        },
        endDate: {
          gte: date,
        },
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find current school year (active schoolYear type session)
   *
   * @returns Current school year academic session or null
   */
  async findCurrentSchoolYear(): Promise<AcademicSession | null> {
    const now = new Date();

    return this.prisma.academicSession.findFirst({
      where: {
        type: 'schoolYear',
        status: 'active',
        startDate: {
          lte: now,
        },
        endDate: {
          gte: now,
        },
      },
    });
  }

  /**
   * Find all ancestors of an academic session (recursive query)
   *
   * @param sourcedId - Academic session sourcedId
   * @returns Array of ancestor sessions (from direct parent to root)
   */
  async findAncestors(sourcedId: string): Promise<AcademicSession[]> {
    const ancestors: AcademicSession[] = [];
    let currentSession = await this.findBySourcedId(sourcedId);

    while (currentSession?.parentSourcedId) {
      const parent = await this.findBySourcedId(currentSession.parentSourcedId);
      if (!parent) break;
      ancestors.push(parent);
      currentSession = parent;
    }

    return ancestors;
  }

  /**
   * Find all descendants of an academic session (recursive query)
   *
   * @param sourcedId - Academic session sourcedId
   * @returns Array of descendant sessions (all levels)
   */
  async findDescendants(sourcedId: string): Promise<AcademicSession[]> {
    const descendants: AcademicSession[] = [];
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
   * Count academic sessions by type
   *
   * @param type - AcademicSessionType
   * @returns Number of sessions with specified type
   */
  async countByType(type: AcademicSessionType): Promise<number> {
    return this.count({ where: { type } });
  }

  /**
   * Count academic sessions by school year
   *
   * @param schoolYear - School year
   * @returns Number of sessions in specified school year
   */
  async countBySchoolYear(schoolYear: string): Promise<number> {
    return this.count({ where: { schoolYear } });
  }

  /**
   * Check if academic session has children
   *
   * @param sourcedId - Academic session sourcedId
   * @returns True if session has children, false otherwise
   */
  async hasChildren(sourcedId: string): Promise<boolean> {
    const count = await this.prisma.academicSession.count({
      where: { parentSourcedId: sourcedId },
    });
    return count > 0;
  }
}
