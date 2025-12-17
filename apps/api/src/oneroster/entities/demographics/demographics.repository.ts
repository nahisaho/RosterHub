import { Injectable } from '@nestjs/common';
import { Demographic, Sex, StatusType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

/**
 * Demographic Filter Options
 */
export interface DemographicFilterOptions {
  dateLastModified?: string;
  status?: StatusType;
  sex?: Sex;
  birthDateFrom?: Date;
  birthDateTo?: Date;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * Demographic Repository
 *
 * Handles all database operations for Demographic entity.
 * Demographics contain user demographic information (birthDate, sex, etc.).
 * Has 1:1 relationship with User entity.
 * OneRoster Specification: Section 4.9 Demographics (Japan Profile extension)
 */
@Injectable()
export class DemographicsRepository extends BaseRepository<Demographic> {
  constructor(prisma: PrismaService) {
    super(prisma, 'demographic');
  }

  /**
   * Find demographics with filtering, pagination, and sorting
   *
   * @param options - Filter options (Delta API, status, sex, birthDate range, pagination)
   * @returns Array of demographics matching filter criteria
   */
  async findAllWithFilter(
    options: DemographicFilterOptions = {},
  ): Promise<Demographic[]> {
    const {
      dateLastModified,
      status,
      sex,
      birthDateFrom,
      birthDateTo,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.DemographicWhereInput = {
      ...this.buildDeltaWhereClause(dateLastModified),
      ...(status && { status }),
      ...(sex && { sex }),
      ...(birthDateFrom && {
        birthDate: {
          gte: birthDateFrom,
        },
      }),
      ...(birthDateTo && {
        birthDate: {
          lte: birthDateTo,
        },
      }),
    };

    return this.findAll({
      where: whereClause,
      ...this.buildPaginationOptions(offset, limit),
      orderBy: this.buildOrderByClause(orderBy),
      include: {
        user: true,
      },
    });
  }

  /**
   * Find demographic by sourcedId with relationships
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns Demographic with user information
   */
  async findBySourcedIdWithRelations(
    sourcedId: string,
  ): Promise<Demographic | null> {
    return await this.prisma.demographic.findUnique({
      where: { sourcedId },
      include: {
        user: {
          include: {
            orgs: {
              include: {
                org: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find demographic by user sourcedId (1:1 relationship)
   *
   * @param userSourcedId - User sourcedId
   * @returns Demographic or null if not found
   */
  async findByUserSourcedId(
    userSourcedId: string,
  ): Promise<Demographic | null> {
    return await this.prisma.demographic.findUnique({
      where: { userSourcedId },
    });
  }

  /**
   * Find demographics by sex
   *
   * @param sex - Sex (male, female, other, unknown)
   * @param options - Pagination options
   * @returns Demographics with specified sex
   */
  async findBySex(
    sex: Sex,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Demographic[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { sex },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find demographics by birth date range
   *
   * @param from - Start date (inclusive)
   * @param to - End date (inclusive)
   * @param options - Pagination options
   * @returns Demographics with birth dates in specified range
   */
  async findByBirthDateRange(
    from: Date,
    to: Date,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Demographic[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: {
        birthDate: {
          gte: from,
          lte: to,
        },
      },
      ...this.buildPaginationOptions(offset, limit),
      orderBy: {
        birthDate: 'asc',
      },
    });
  }

  /**
   * Find demographics by age range (calculated from birthDate)
   *
   * @param minAge - Minimum age (inclusive)
   * @param maxAge - Maximum age (inclusive)
   * @param referenceDate - Reference date for age calculation (default: now)
   * @param options - Pagination options
   * @returns Demographics within specified age range
   */
  async findByAgeRange(
    minAge: number,
    maxAge: number,
    referenceDate: Date = new Date(),
    options: { offset?: number; limit?: number } = {},
  ): Promise<Demographic[]> {
    // Calculate birth date range from age range
    const maxBirthDate = new Date(referenceDate);
    maxBirthDate.setFullYear(maxBirthDate.getFullYear() - minAge);

    const minBirthDate = new Date(referenceDate);
    minBirthDate.setFullYear(minBirthDate.getFullYear() - maxAge - 1);

    return this.findByBirthDateRange(minBirthDate, maxBirthDate, options);
  }

  /**
   * Count demographics by sex
   *
   * @param sex - Sex
   * @returns Number of demographics with specified sex
   */
  async countBySex(sex: Sex): Promise<number> {
    return this.count({ where: { sex } });
  }

  /**
   * Count demographics by age range
   *
   * @param minAge - Minimum age
   * @param maxAge - Maximum age
   * @param referenceDate - Reference date for age calculation (default: now)
   * @returns Number of demographics within specified age range
   */
  async countByAgeRange(
    minAge: number,
    maxAge: number,
    referenceDate: Date = new Date(),
  ): Promise<number> {
    const maxBirthDate = new Date(referenceDate);
    maxBirthDate.setFullYear(maxBirthDate.getFullYear() - minAge);

    const minBirthDate = new Date(referenceDate);
    minBirthDate.setFullYear(minBirthDate.getFullYear() - maxAge - 1);

    return this.count({
      where: {
        birthDate: {
          gte: minBirthDate,
          lte: maxBirthDate,
        },
      },
    });
  }

  /**
   * Check if demographic exists for user
   *
   * @param userSourcedId - User sourcedId
   * @returns True if demographic exists, false otherwise
   */
  async existsByUserSourcedId(userSourcedId: string): Promise<boolean> {
    const count = await this.prisma.demographic.count({
      where: { userSourcedId },
    });
    return count > 0;
  }

  /**
   * Get demographic statistics
   *
   * @returns Aggregated statistics (count by sex, age distribution)
   */
  async getStatistics() {
    const [totalCount, sexDistribution] = await Promise.all([
      this.count({ where: { status: 'active' } }),
      this.prisma.demographic.groupBy({
        by: ['sex'],
        where: { status: 'active' },
        _count: {
          sex: true,
        },
      }),
    ]);

    return {
      totalCount,
      sexDistribution: sexDistribution.map((item) => ({
        sex: item.sex,
        count: item._count.sex,
      })),
    };
  }
}
