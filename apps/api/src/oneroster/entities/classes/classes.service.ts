import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClassesRepository } from './classes.repository';
import { ClassResponseDto } from './dto/class-response.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { FilterParserService } from '../../common/services/filter-parser.service';
import { FieldSelectionService } from '../../common/services/field-selection.service';

/**
 * Classes Service
 *
 * Business logic for class operations.
 */
@Injectable()
export class ClassesService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly filterParser: FilterParserService,
    private readonly fieldSelection: FieldSelectionService,
  ) {}

  async findAll(query: QueryClassesDto) {
    const {
      limit = 100,
      offset = 0,
      filter,
      sort,
      orderBy = 'asc',
      fields,
      classType,
      status,
    } = query;

    // Parse OneRoster filter expression
    const filterableFields = this.fieldSelection.getFilterableFields('classes');
    let whereClause: any = {};

    if (filter) {
      whereClause = this.filterParser.parseFilter(filter, filterableFields);
    }

    // Add direct query params to where clause
    if (classType) whereClause.classType = classType;
    if (status) whereClause.status = status;

    // Build sort clause
    const sortableFields = this.fieldSelection.getSortableFields('classes');
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

    const classes = await this.classesRepository.findAll({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    });

    const total = await this.classesRepository.count({ where: whereClause });

    const classDtos = classes.map((cls) => new ClassResponseDto(cls));

    const filteredDtos = fields
      ? this.fieldSelection.filterEntities(classDtos, fields)
      : classDtos;

    return {
      classes: filteredDtos,
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<ClassResponseDto> {
    const classEntity = await this.classesRepository.findBySourcedId(sourcedId);

    if (!classEntity) {
      throw new NotFoundException(
        `Class with sourcedId '${sourcedId}' not found`,
      );
    }

    return new ClassResponseDto(classEntity);
  }

  /**
   * Update class by sourcedId
   */
  async update(
    sourcedId: string,
    updateDto: UpdateClassDto,
  ): Promise<ClassResponseDto> {
    const existing = await this.classesRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(
        `Class with sourcedId '${sourcedId}' not found`,
      );
    }

    const updated = await this.classesRepository.update(sourcedId, updateDto);
    return new ClassResponseDto(updated);
  }

  /**
   * Soft delete class (set status to 'tobedeleted')
   */
  async remove(sourcedId: string): Promise<void> {
    const existing = await this.classesRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(
        `Class with sourcedId '${sourcedId}' not found`,
      );
    }

    await this.classesRepository.softDelete(sourcedId);
  }
}
