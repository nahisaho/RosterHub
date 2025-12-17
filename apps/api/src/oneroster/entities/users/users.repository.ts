import { Injectable } from '@nestjs/common';
import { User, UserRole, StatusType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

/**
 * User Filter Options
 */
export interface UserFilterOptions {
  dateLastModified?: string;
  status?: StatusType;
  role?: UserRole;
  email?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * User Repository
 *
 * Handles all database operations for User entity.
 * Extends BaseRepository to inherit common CRUD operations.
 */
@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user');
  }

  /**
   * Find users with filtering, pagination, and sorting
   *
   * @param options - Filter options (Delta API, status, role, email, pagination)
   * @returns Array of users matching filter criteria
   */
  async findAllWithFilter(options: UserFilterOptions = {}): Promise<User[]> {
    const {
      dateLastModified,
      status,
      role,
      email,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.UserWhereInput = {
      ...this.buildDeltaWhereClause(dateLastModified),
      ...(status && { status }),
      ...(role && { role }),
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
    };

    return this.findAll({
      where: whereClause,
      ...this.buildPaginationOptions(offset, limit),
      orderBy: this.buildOrderByClause(orderBy),
      include: {
        demographic: true,
        orgs: {
          include: {
            org: true,
          },
        },
      },
    });
  }

  /**
   * Find user by sourcedId with relationships
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns User with orgs, agents, and demographic
   */
  async findBySourcedIdWithRelations(sourcedId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { sourcedId },
      include: {
        demographic: true,
        orgs: {
          include: {
            org: true,
          },
        },
        agents: {
          include: {
            agent: true,
          },
        },
        enrollments: {
          include: {
            class: true,
            school: true,
          },
        },
      },
    });
  }

  /**
   * Find user by email address
   *
   * @param email - User email
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: { email },
    });
  }

  /**
   * Find user by identifier (unique external ID)
   *
   * @param identifier - OneRoster identifier
   * @returns User or null if not found
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { identifier },
    });
  }

  /**
   * Find users by role
   *
   * @param role - UserRole (student, teacher, staff, administrator)
   * @param options - Pagination options
   * @returns Users with specified role
   */
  async findByRole(
    role: UserRole,
    options: { offset?: number; limit?: number } = {},
  ): Promise<User[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { role },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find users by organization
   *
   * @param orgSourcedId - Organization sourcedId
   * @param options - Pagination options
   * @returns Users belonging to specified organization
   */
  async findByOrg(
    orgSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<User[]> {
    const { offset = 0, limit = 100 } = options;

    return await this.prisma.user.findMany({
      where: {
        orgs: {
          some: {
            orgSourcedId,
          },
        },
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Count users by status
   *
   * @param status - StatusType (active, tobedeleted, inactive)
   * @returns Number of users with specified status
   */
  async countByStatus(status: StatusType): Promise<number> {
    return this.count({ where: { status } });
  }

  /**
   * Count users by role
   *
   * @param role - UserRole
   * @returns Number of users with specified role
   */
  async countByRole(role: UserRole): Promise<number> {
    return this.count({ where: { role } });
  }

  /**
   * Check if user exists by email
   *
   * @param email - User email
   * @returns True if user exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Check if user exists by identifier
   *
   * @param identifier - OneRoster identifier
   * @returns True if user exists, false otherwise
   */
  async existsByIdentifier(identifier: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { identifier },
    });
    return count > 0;
  }
}
