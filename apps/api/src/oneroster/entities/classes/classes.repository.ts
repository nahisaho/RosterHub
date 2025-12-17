import { Injectable } from '@nestjs/common';
import { Class, ClassType, StatusType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

/**
 * Class Filter Options
 */
export interface ClassFilterOptions {
  dateLastModified?: string;
  status?: StatusType;
  classType?: ClassType;
  courseSourcedId?: string;
  schoolSourcedId?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * Class Repository
 *
 * Handles all database operations for Class entity.
 * Classes represent course instances with specific terms/periods.
 * OneRoster Specification: Section 4.5 Classes
 */
@Injectable()
export class ClassesRepository extends BaseRepository<Class> {
  constructor(prisma: PrismaService) {
    super(prisma, 'class');
  }

  /**
   * Find classes with filtering, pagination, and sorting
   *
   * @param options - Filter options (Delta API, status, type, course, school, pagination)
   * @returns Array of classes matching filter criteria
   */
  async findAllWithFilter(options: ClassFilterOptions = {}): Promise<Class[]> {
    const {
      dateLastModified,
      status,
      classType,
      courseSourcedId,
      schoolSourcedId,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.ClassWhereInput = {
      ...this.buildDeltaWhereClause(dateLastModified),
      ...(status && { status }),
      ...(classType && { classType }),
      ...(courseSourcedId && { courseSourcedId }),
      ...(schoolSourcedId && { schoolSourcedId }),
    };

    return this.findAll({
      where: whereClause,
      ...this.buildPaginationOptions(offset, limit),
      orderBy: this.buildOrderByClause(orderBy),
      include: {
        course: true,
        school: true,
        enrollments: {
          include: {
            user: true,
          },
        },
        academicSessions: {
          include: {
            academicSession: true,
          },
        },
      },
    });
  }

  /**
   * Find class by sourcedId with relationships
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns Class with course, school, enrollments, and academic sessions
   */
  async findBySourcedIdWithRelations(sourcedId: string): Promise<Class | null> {
    return this.prisma.class.findUnique({
      where: { sourcedId },
      include: {
        course: true,
        school: true,
        enrollments: {
          include: {
            user: true,
          },
        },
        academicSessions: {
          include: {
            academicSession: true,
          },
        },
      },
    });
  }

  /**
   * Find classes by course
   *
   * @param courseSourcedId - Course sourcedId
   * @param options - Pagination options
   * @returns Classes belonging to specified course
   */
  async findByCourse(
    courseSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Class[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { courseSourcedId },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find classes by school
   *
   * @param schoolSourcedId - School sourcedId
   * @param options - Pagination options
   * @returns Classes belonging to specified school
   */
  async findBySchool(
    schoolSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Class[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { schoolSourcedId },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find classes by type
   *
   * @param classType - ClassType (homeroom, scheduled)
   * @param options - Pagination options
   * @returns Classes with specified type
   */
  async findByType(
    classType: ClassType,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Class[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { classType },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find classes by academic session
   *
   * @param academicSessionSourcedId - AcademicSession sourcedId
   * @param options - Pagination options
   * @returns Classes scheduled in specified academic session
   */
  async findByAcademicSession(
    academicSessionSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Class[]> {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.class.findMany({
      where: {
        academicSessions: {
          some: {
            academicSessionSourcedId,
          },
        },
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find enrolled students in a class
   *
   * @param classSourcedId - Class sourcedId
   * @param options - Pagination options
   * @returns Enrollments with user data
   */
  async findEnrolledStudents(
    classSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ) {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.enrollment.findMany({
      where: {
        classSourcedId,
        user: {
          role: 'student',
        },
      },
      include: {
        user: true,
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find teachers assigned to a class
   *
   * @param classSourcedId - Class sourcedId
   * @param options - Pagination options
   * @returns Enrollments with teacher data
   */
  async findTeachers(
    classSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ) {
    const { offset = 0, limit = 100 } = options;

    return this.prisma.enrollment.findMany({
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
   * Count classes by school
   *
   * @param schoolSourcedId - School sourcedId
   * @returns Number of classes in specified school
   */
  async countBySchool(schoolSourcedId: string): Promise<number> {
    return this.count({ where: { schoolSourcedId } });
  }

  /**
   * Count classes by course
   *
   * @param courseSourcedId - Course sourcedId
   * @returns Number of classes for specified course
   */
  async countByCourse(courseSourcedId: string): Promise<number> {
    return this.count({ where: { courseSourcedId } });
  }

  /**
   * Count classes by type
   *
   * @param classType - ClassType
   * @returns Number of classes with specified type
   */
  async countByType(classType: ClassType): Promise<number> {
    return this.count({ where: { classType } });
  }
}
