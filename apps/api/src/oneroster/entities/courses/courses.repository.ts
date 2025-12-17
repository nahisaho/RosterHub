import { Injectable } from '@nestjs/common';
import { Course, StatusType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

/**
 * Course Filter Options
 */
export interface CourseFilterOptions {
  dateLastModified?: string;
  status?: StatusType;
  schoolSourcedId?: string;
  schoolYear?: string;
  courseCode?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/**
 * Course Repository
 *
 * Handles all database operations for Course entity.
 * Courses represent course catalog definitions.
 * OneRoster Specification: Section 4.6 Courses
 */
@Injectable()
export class CoursesRepository extends BaseRepository<Course> {
  constructor(prisma: PrismaService) {
    super(prisma, 'course');
  }

  /**
   * Find courses with filtering, pagination, and sorting
   *
   * @param options - Filter options (Delta API, status, school, schoolYear, courseCode, pagination)
   * @returns Array of courses matching filter criteria
   */
  async findAllWithFilter(
    options: CourseFilterOptions = {},
  ): Promise<Course[]> {
    const {
      dateLastModified,
      status,
      schoolSourcedId,
      schoolYear,
      courseCode,
      offset = 0,
      limit = 100,
      orderBy,
    } = options;

    const whereClause: Prisma.CourseWhereInput = {
      ...this.buildDeltaWhereClause(dateLastModified),
      ...(status && { status }),
      ...(schoolSourcedId && { schoolSourcedId }),
      ...(schoolYear && { schoolYear }),
      ...(courseCode && {
        courseCode: { contains: courseCode, mode: 'insensitive' },
      }),
    };

    return this.findAll({
      where: whereClause,
      ...this.buildPaginationOptions(offset, limit),
      orderBy: this.buildOrderByClause(orderBy),
      include: {
        school: true,
        classes: true,
      },
    });
  }

  /**
   * Find course by sourcedId with relationships
   *
   * @param sourcedId - OneRoster sourcedId
   * @returns Course with school and classes
   */
  async findBySourcedIdWithRelations(
    sourcedId: string,
  ): Promise<Course | null> {
    return this.prisma.course.findUnique({
      where: { sourcedId },
      include: {
        school: true,
        classes: {
          include: {
            enrollments: true,
          },
        },
      },
    });
  }

  /**
   * Find course by course code
   *
   * @param courseCode - Course code
   * @returns Course or null if not found
   */
  async findByCourseCode(courseCode: string): Promise<Course | null> {
    return this.prisma.course.findFirst({
      where: { courseCode },
    });
  }

  /**
   * Find courses by school
   *
   * @param schoolSourcedId - School sourcedId
   * @param options - Pagination options
   * @returns Courses belonging to specified school
   */
  async findBySchool(
    schoolSourcedId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Course[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { schoolSourcedId },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Find courses by school year
   *
   * @param schoolYear - School year (e.g., "2024")
   * @param options - Pagination options
   * @returns Courses for specified school year
   */
  async findBySchoolYear(
    schoolYear: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Course[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: { schoolYear },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Search courses by title
   *
   * @param title - Course title search term
   * @param options - Pagination options
   * @returns Courses matching title search
   */
  async searchByTitle(
    title: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<Course[]> {
    const { offset = 0, limit = 100 } = options;

    return this.findAll({
      where: {
        title: {
          contains: title,
          mode: 'insensitive',
        },
      },
      ...this.buildPaginationOptions(offset, limit),
    });
  }

  /**
   * Count courses by school
   *
   * @param schoolSourcedId - School sourcedId
   * @returns Number of courses in specified school
   */
  async countBySchool(schoolSourcedId: string): Promise<number> {
    return this.count({ where: { schoolSourcedId } });
  }

  /**
   * Count courses by school year
   *
   * @param schoolYear - School year
   * @returns Number of courses in specified school year
   */
  async countBySchoolYear(schoolYear: string): Promise<number> {
    return this.count({ where: { schoolYear } });
  }

  /**
   * Check if course exists by course code
   *
   * @param courseCode - Course code
   * @returns True if course exists, false otherwise
   */
  async existsByCourseCode(courseCode: string): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: { courseCode },
    });
    return count > 0;
  }
}
