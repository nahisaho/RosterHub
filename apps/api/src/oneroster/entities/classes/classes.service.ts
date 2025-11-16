import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassesRepository } from './classes.repository';
import { ClassResponseDto } from './dto/class-response.dto';
import { QueryClassesDto } from './dto/query-classes.dto';

/**
 * Classes Service
 *
 * Business logic for class operations.
 */
@Injectable()
export class ClassesService {
  constructor(private readonly classesRepository: ClassesRepository) {}

  async findAll(query: QueryClassesDto) {
    const { limit = 100, offset = 0, filter, sort, classType, status } = query;

    let dateLastModified: string | undefined;
    if (filter) {
      const match = filter.match(/dateLastModified>=(.+?)(?:\s|$)/);
      if (match) dateLastModified = match[1];
    }

    const classes = await this.classesRepository.findAllWithFilter({
      dateLastModified,
      classType,
      status,
      offset,
      limit,
      orderBy: sort || '-dateLastModified',
    });

    const total = await this.classesRepository.count({
      where: {
        ...(dateLastModified && {
          dateLastModified: { gte: new Date(dateLastModified) },
        }),
        ...(classType && { classType }),
        ...(status && { status }),
      },
    });

    return {
      classes: classes.map((cls) => new ClassResponseDto(cls)),
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<ClassResponseDto> {
    const classEntity = await this.classesRepository.findBySourcedId(sourcedId);

    if (!classEntity) {
      throw new NotFoundException(`Class with sourcedId '${sourcedId}' not found`);
    }

    return new ClassResponseDto(classEntity);
  }
}
