import { Injectable, NotFoundException } from '@nestjs/common';
import { CoursesRepository } from './courses.repository';
import { CourseResponseDto } from './dto/course-response.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async findAll(query: QueryCoursesDto) {
    const { limit = 100, offset = 0, filter, sort, status } = query;

    let dateLastModified: string | undefined;
    if (filter) {
      const match = filter.match(/dateLastModified>=(.+?)(?:\s|$)/);
      if (match) dateLastModified = match[1];
    }

    const courses = await this.coursesRepository.findAllWithFilter({
      dateLastModified,
      status,
      offset,
      limit,
      orderBy: sort || '-dateLastModified',
    });

    const total = await this.coursesRepository.count({
      where: {
        ...(dateLastModified && {
          dateLastModified: { gte: new Date(dateLastModified) },
        }),
        ...(status && { status }),
      },
    });

    return {
      courses: courses.map((course) => new CourseResponseDto(course)),
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<CourseResponseDto> {
    const course = await this.coursesRepository.findBySourcedId(sourcedId);
    if (!course) {
      throw new NotFoundException(`Course with sourcedId '${sourcedId}' not found`);
    }
    return new CourseResponseDto(course);
  }
}
