import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AcademicSessionsRepository } from './academic-sessions.repository';
import { AcademicSessionResponseDto } from './dto/academic-session-response.dto';
import { QueryAcademicSessionsDto } from './dto/query-academic-sessions.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { FilterParserService } from '../../common/services/filter-parser.service';
import { FieldSelectionService } from '../../common/services/field-selection.service';

@Injectable()
export class AcademicSessionsService {
  constructor(
    private readonly academicSessionsRepository: AcademicSessionsRepository,
    private readonly filterParser: FilterParserService,
    private readonly fieldSelection: FieldSelectionService,
  ) {}

  async findAll(query: QueryAcademicSessionsDto) {
    const { limit = 100, offset = 0, filter, sort, orderBy = 'asc', fields, type, status } = query;

    // Parse OneRoster filter expression
    const filterableFields = this.fieldSelection.getFilterableFields('academicSessions');
    let whereClause: any = {};
    
    if (filter) {
      whereClause = this.filterParser.parseFilter(filter, filterableFields);
    }

    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    // Build sort clause
    const sortableFields = this.fieldSelection.getSortableFields('academicSessions');
    let orderByClause: any = { dateLastModified: 'desc' };

    if (sort) {
      let sortField = sort;
      let sortOrder: 'asc' | 'desc' = orderBy as 'asc' | 'desc';

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

    const sessions = await this.academicSessionsRepository.findAll({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    });

    const total = await this.academicSessionsRepository.count({ where: whereClause });

    const sessionDtos = sessions.map((session) => new AcademicSessionResponseDto(session));

    const filteredDtos = fields
      ? this.fieldSelection.filterEntities(sessionDtos, fields)
      : sessionDtos;

    return {
      academicSessions: filteredDtos,
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<AcademicSessionResponseDto> {
    const session = await this.academicSessionsRepository.findBySourcedId(sourcedId);
    if (!session) {
      throw new NotFoundException(`AcademicSession with sourcedId '${sourcedId}' not found`);
    }
    return new AcademicSessionResponseDto(session);
  }

  async update(sourcedId: string, updateDto: UpdateAcademicSessionDto): Promise<AcademicSessionResponseDto> {
    const existing = await this.academicSessionsRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(`AcademicSession with sourcedId '${sourcedId}' not found`);
    }
    const updated = await this.academicSessionsRepository.update(sourcedId, {
      ...updateDto,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
    });
    return new AcademicSessionResponseDto(updated);
  }

  async remove(sourcedId: string): Promise<void> {
    const existing = await this.academicSessionsRepository.findBySourcedId(sourcedId);
    if (!existing) {
      throw new NotFoundException(`AcademicSession with sourcedId '${sourcedId}' not found`);
    }
    await this.academicSessionsRepository.softDelete(sourcedId);
  }
}
