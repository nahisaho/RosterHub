import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CoursesRepository } from './courses.repository';
import { CourseResponseDto } from './dto/course-response.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FilterParserService } from '../../common/services/filter-parser.service';
import { FieldSelectionService } from '../../common/services/field-selection.service';

@Injectable()
export class CoursesService {
  constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly filterParser: FilterParserService,
    private readonly fieldSelection: FieldSelectionService,
  ) {}

  async findAll(query: QueryCoursesDto) {
    const {
      limit = 100,
      offset = 0,
      filter,
      sort,
      orderBy = 'asc',
      fields,
      status,
    } = query;

    // Parse OneRoster filter expression
    const filterableFields = this.fieldSelection.getFilterableFields('courses');
    let whereClause: any = {};

    if (filter) {
      whereClause = this.filterParser.parseFilter(filter, filterableFields);
    }

    if (status) whereClause.status = status;

    // Build sort clause
    const sortableFields = this.fieldSelection.getSortableFields('courses');
    let orderByClause: any = { dateLastModified: 'desc' };

    if (sort) {
      let sortField = sort;
      let sortOrder: 'asc' | 'desc' = orderBy;

      if (sort.startsWith('-')) {
        sortField = sort.substring(1);
        sortOrder = 'desc';
      }

      if (sortableFields && !sortableFields.includes(sortField)) {
        throw new BadRequestException(
          `Field '${sortField}' is not sortable. Sortable fields: ${sortableFields.join(', ')}`,
        );
      }
      orderByClause = { [sortField]: sortOrder };
    }

    const courses = await this.coursesRepository.findAll({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    });

    const total = await this.coursesRepository.count({ where: whereClause });

    const courseDtos = courses.map((course) => new CourseResponseDto(course));

    const filteredDtos = fields
      ? this.fieldSelection.filterEntities(courseDtos, fields)
      : courseDtos;

    return {
      courses: filteredDtos,
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<CourseResponseDto> {
    const course = await this.coursesRepository.findBySourcedId(sourcedId);
    if (!course) {
      throw new NotFoundException(
        `Course with sourcedId '${sourcedId}' not found`,
      );
    }
    return new CourseResponseDto(course);
  }

  async update(
    sourcedId: string,
    updateDto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    const existing = await this.coursesRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(
        `Course with sourcedId '${sourcedId}' not found`,
      );
    }
    const updated = await this.coursesRepository.update(sourcedId, updateDto);
    return new CourseResponseDto(updated);
  }

  async remove(sourcedId: string): Promise<void> {
    const existing = await this.coursesRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(
        `Course with sourcedId '${sourcedId}' not found`,
      );
    }
    await this.coursesRepository.softDelete(sourcedId);
  }
}
