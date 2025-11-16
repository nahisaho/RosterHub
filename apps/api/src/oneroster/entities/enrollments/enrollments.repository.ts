import { Injectable } from '@nestjs/common';
import { Enrollment, EnrollmentRole, StatusType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

/**
 * Enrollment Filter Options
 */
export interface EnrollmentFilterOptions {
  dateLastModified?: string;
  status?: StatusType;
  role?: EnrollmentRole;
  userSourcedId?: string;
  classSourcedId?: string;
  schoolSourcedId?: string;
  primary?: boolean;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * Enrollment Repository
 *
 * Handles all database operations for Enrollment entity.
 * Enrollments represent user-class relationships (students/teachers in classes).
 * OneRoster Specification: Section 4.7 Enrollments
 */
@Injectable()
export class EnrollmentsRepository extends BaseRepository<Enrollment> {
  constructor(prisma: PrismaService) {
    super(prisma, 'enrollment');
  }

  /**
   * Find enrollments with filtering, pagination, and sorting
   *
   * @param options - Filter options (Delta API, status, role, user, class, school, pagination)
   * @returns Array of enrollments matching filter criteria
   */
  async findAllWithFilter(options: EnrollmentFilterOptions = {}): Promise<Enrollment[]> {
    const {
      dateLastModified,
      status,
      role,
      userSourcedId,
      classSourcedId,
      schoolSourcedId,
      primary,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.EnrollmentWhereInput = {
      ...this.buildDeltaWhereClause(dateLastModified),
      ...(status && { status }),
      ...(role && { role }),
      ...(userSourcedId && { userSourcedId }),
      ...(classSourcedId && { classSourcedId }),
      ...(schoolSourcedId && { schoolSourcedId }),
      ...(primary !== undefined && { primary }),
    };

    return this.findAll({
      where: whereClause,
      ...this.buildPaginationOptions(offset, limit),
      orderBy: this.buildOrderByClause(orderBy),
      include: {
        user: true,
        class: true,
        school: true,
      },
    });
  }

  /**
   * Find enrollment by sourcedId with relationships
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns Enrollment with user, class, and school
   */
  async findBySourcedIdWithRelations(sourcedId: string): Promise<Enrollment | null> {
    return this.prisma.enrollment.findUnique({
      where: { sourcedId },
      include: {
        user: {
          include: {
            demographic: true,
          },
        },
        class: {
          include: {
            course: true,
          },
        },
        school: true,
      },
    });
  }

  /**
   * Find enrollments by user
   *
   * @param userSourcedId - User sourcedId
   * @param options - Pagination options
   * @returns Enrollments for specified user
   */
  async findByUser(
    userSourcedId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<Enrollment[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { userSourcedId },
      include: {
        class: {
          include: {
            course: true,
          },
        },
        school: true,
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find enrollments by class
   *
   * @param classSourcedId - Class sourcedId
   * @param options - Pagination options
   * @returns Enrollments for specified class
   */
  async findByClass(
    classSourcedId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<Enrollment[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { classSourcedId },
      include: {
        user: true,
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find enrollments by school
   *
   * @param schoolSourcedId - School sourcedId
   * @param options - Pagination options
   * @returns Enrollments for specified school
   */
  async findBySchool(
    schoolSourcedId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<Enrollment[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { schoolSourcedId },
      include: {
        user: true,
        class: true,
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find enrollments by role
   *
   * @param role - EnrollmentRole (primary, secondary, aide)
   * @param options - Pagination options
   * @returns Enrollments with specified role
   */
  async findByRole(
    role: EnrollmentRole,
    options: { offset?: number; limit?: number } = {}
  ): Promise<Enrollment[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { role },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find student enrollments in a class
   *
   * @param classSourcedId - Class sourcedId
   * @param options - Pagination options
   * @returns Student enrollments
   */
  async findStudentsByClass(
    classSourcedId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<Enrollment[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: {
        classSourcedId,
        user: {
          role: 'student',
        },
      },
      include: {
        user: {
          include: {
            demographic: true,
          },
        },
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find teacher enrollments in a class
   *
   * @param classSourcedId - Class sourcedId
   * @param options - Pagination options
   * @returns Teacher enrollments
   */
  async findTeachersByClass(
    classSourcedId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<Enrollment[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: {
        classSourcedId,
        user: {
          role: 'teacher',
        },
      },
      include: {
        user: true,
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find enrollment by user and class (unique constraint)
   *
   * @param userSourcedId - User sourcedId
   * @param classSourcedId - Class sourcedId
   * @returns Enrollment or null if not found
   */
  async findByUserAndClass(
    userSourcedId: string,
    classSourcedId: string
  ): Promise<Enrollment | null> {
    return this.prisma.enrollment.findUnique({
      where: {
        userSourcedId_classSourcedId: {
          userSourcedId,
          classSourcedId,
        },
      },
    });
  }

  /**
   * Find active enrollments (within date range)
   *
   * @param date - Reference date (default: now)
   * @param options - Pagination options
   * @returns Active enrollments on specified date
   */
  async findActive(
    date: Date = new Date(),
    options: { offset?: number; limit?: number } = {}
  ): Promise<Enrollment[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: {
        status: 'active',
        OR: [
          {
            beginDate: {
              lte: date,
            },
            endDate: {
              gte: date,
            },
          },
          {
            beginDate: null,
            endDate: null,
          },
        ],
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Count enrollments by class
   *
   * @param classSourcedId - Class sourcedId
   * @returns Number of enrollments in specified class
   */
  async countByClass(classSourcedId: string): Promise<number> {
    return this.count({ where: { classSourcedId } });
  }

  /**
   * Count enrollments by user
   *
   * @param userSourcedId - User sourcedId
   * @returns Number of enrollments for specified user
   */
  async countByUser(userSourcedId: string): Promise<number> {
    return this.count({ where: { userSourcedId } });
  }

  /**
   * Count enrollments by school
   *
   * @param schoolSourcedId - School sourcedId
   * @returns Number of enrollments in specified school
   */
  async countBySchool(schoolSourcedId: string): Promise<number> {
    return this.count({ where: { schoolSourcedId } });
  }

  /**
   * Check if enrollment exists for user and class
   *
   * @param userSourcedId - User sourcedId
   * @param classSourcedId - Class sourcedId
   * @returns True if enrollment exists, false otherwise
   */
  async existsByUserAndClass(
    userSourcedId: string,
    classSourcedId: string
  ): Promise<boolean> {
    const count = await this.prisma.enrollment.count({
      where: {
        userSourcedId,
        classSourcedId,
      },
    });
    return count > 0;
  }
}
