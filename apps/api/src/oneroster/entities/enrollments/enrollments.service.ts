import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EnrollmentsRepository } from './enrollments.repository';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { QueryEnrollmentsDto } from './dto/query-enrollments.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { FilterParserService } from '../../common/services/filter-parser.service';
import { FieldSelectionService } from '../../common/services/field-selection.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly filterParser: FilterParserService,
    private readonly fieldSelection: FieldSelectionService,
  ) {}

  async findAll(query: QueryEnrollmentsDto) {
    const {
      limit = 100,
      offset = 0,
      filter,
      sort,
      orderBy = 'asc',
      fields,
      role,
      status,
    } = query;

    // Parse OneRoster filter expression
    const filterableFields =
      this.fieldSelection.getFilterableFields('enrollments');
    let whereClause: any = {};

    if (filter) {
      whereClause = this.filterParser.parseFilter(filter, filterableFields);
    }

    if (role) whereClause.role = role;
    if (status) whereClause.status = status;

    // Build sort clause
    const sortableFields = this.fieldSelection.getSortableFields('enrollments');
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

    const enrollments = await this.enrollmentsRepository.findAll({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    });

    const total = await this.enrollmentsRepository.count({
      where: whereClause,
    });

    const enrollmentDtos = enrollments.map(
      (enrollment) => new EnrollmentResponseDto(enrollment),
    );

    const filteredDtos = fields
      ? this.fieldSelection.filterEntities(enrollmentDtos, fields)
      : enrollmentDtos;

    return {
      enrollments: filteredDtos,
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<EnrollmentResponseDto> {
    const enrollment =
      await this.enrollmentsRepository.findBySourcedId(sourcedId);
    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment with sourcedId '${sourcedId}' not found`,
      );
    }
    return new EnrollmentResponseDto(enrollment);
  }

  async update(
    sourcedId: string,
    updateDto: UpdateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    const existing =
      await this.enrollmentsRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(
        `Enrollment with sourcedId '${sourcedId}' not found`,
      );
    }
    const updated = await this.enrollmentsRepository.update(sourcedId, {
      ...updateDto,
      beginDate: updateDto.beginDate
        ? new Date(updateDto.beginDate)
        : undefined,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
    });
    return new EnrollmentResponseDto(updated);
  }

  async remove(sourcedId: string): Promise<void> {
    const existing =
      await this.enrollmentsRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(
        `Enrollment with sourcedId '${sourcedId}' not found`,
      );
    }
    await this.enrollmentsRepository.softDelete(sourcedId);
  }

  /**
   * Get enrollments for a specific class
   */
  async findByClass(classSourcedId: string, query: QueryEnrollmentsDto) {
    const modifiedQuery = {
      ...query,
      filter: `classSourcedId='${classSourcedId}'`,
    };
    return this.findAll(modifiedQuery);
  }

  /**
   * Get enrollments for a specific user
   */
  async findByUser(userSourcedId: string, query: QueryEnrollmentsDto) {
    const modifiedQuery = {
      ...query,
      filter: `userSourcedId='${userSourcedId}'`,
    };
    return this.findAll(modifiedQuery);
  }
}
