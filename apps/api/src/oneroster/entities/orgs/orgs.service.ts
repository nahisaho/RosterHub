import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgsRepository } from './orgs.repository';
import { OrgResponseDto } from './dto/org-response.dto';
import { QueryOrgsDto } from './dto/query-orgs.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { FilterParserService } from '../../common/services/filter-parser.service';
import { FieldSelectionService } from '../../common/services/field-selection.service';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

/**
 * Orgs Service
 *
 * Business logic for organization operations.
 * Handles data transformation, validation, and repository interaction.
 *
 * Features:
 * - OneRoster filter parsing (filter query parameter)
 * - Field selection (fields query parameter)
 * - Pagination (limit, offset)
 * - Sorting (sort, orderBy)
 * - Delta/Incremental API support
 */
@Injectable()
export class OrgsService {
  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly filterParser: FilterParserService,
    private readonly fieldSelection: FieldSelectionService,
  ) {}

  /**
   * Get all orgs with pagination, filtering, sorting, and field selection
   *
   * @param query - Query parameters (limit, offset, filter, sort, orderBy, fields)
   * @returns Paginated orgs with metadata
   */
  async findAll(query: QueryOrgsDto): Promise<PaginatedResponse<OrgResponseDto>> {
    const { limit = 100, offset = 0, filter, sort, orderBy = 'asc', fields } = query;

    // Parse OneRoster filter expression
    const filterableFields = this.fieldSelection.getFilterableFields('orgs');
    const whereClause = filter
      ? this.filterParser.parseFilter(filter, filterableFields)
      : {};

    // Build Prisma orderBy clause
    const sortableFields = this.fieldSelection.getSortableFields('orgs');
    let orderByClause: any = { dateLastModified: 'desc' }; // Default sort

    if (sort) {
      // OneRoster spec allows descending sort with minus prefix (e.g., "-dateLastModified")
      let sortField = sort;
      let sortOrder: 'asc' | 'desc' = orderBy as 'asc' | 'desc';

      if (sort.startsWith('-')) {
        sortField = sort.substring(1); // Remove minus prefix
        sortOrder = 'desc';
      }

      // Validate sort field
      if (!sortableFields.includes(sortField)) {
        throw new NotFoundException(
          `Field '${sortField}' is not sortable. Sortable fields: ${sortableFields.join(', ')}`,
        );
      }
      orderByClause = { [sortField]: sortOrder };
    }

    // NOTE: Field selection is handled at DTO level (after fetching), not at database level
    // This ensures OrgResponseDto always receives complete entities
    // Prisma select would return partial entities, breaking the DTO constructor

    // Fetch orgs from repository (always fetch all fields)
    const orgs = await this.orgsRepository.findAll({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    });

    // Count total records for pagination
    const total = await this.orgsRepository.count({ where: whereClause });

    // Convert to DTOs
    const orgDtos = orgs.map((org) => new OrgResponseDto(org));

    // Apply field filtering if selection was requested
    const filteredDtos = fields
      ? this.fieldSelection.filterEntities(orgDtos, fields)
      : orgDtos;

    return new PaginatedResponse(filteredDtos, total, offset, limit);
  }

  /**
   * Get org by sourcedId
   *
   * @param sourcedId - OneRoster sourcedId
   * @param fields - Optional field selection (comma-separated)
   * @returns Org details
   * @throws NotFoundException if org not found
   */
  async findOne(sourcedId: string, fields?: string): Promise<OrgResponseDto | any> {
    const org = await this.orgsRepository.findBySourcedId(sourcedId);

    if (!org) {
      throw new NotFoundException(`Org with sourcedId '${sourcedId}' not found`);
    }

    const orgDto = new OrgResponseDto(org);

    // Apply field filtering if selection was requested
    if (fields) {
      return this.fieldSelection.filterEntity(orgDto, fields);
    }

    return orgDto;
  }

  /**
   * Update org by sourcedId
   *
   * @param sourcedId - OneRoster sourcedId
   * @param updateOrgDto - Update data
   * @returns Updated org details
   * @throws NotFoundException if org not found
   */
  async update(sourcedId: string, updateOrgDto: UpdateOrgDto): Promise<OrgResponseDto> {
    const org = await this.orgsRepository.findBySourcedId(sourcedId);

    if (!org) {
      throw new NotFoundException(`Org with sourcedId '${sourcedId}' not found`);
    }

    const updateData: any = {
      ...updateOrgDto,
      dateLastModified: new Date(),
    };

    // Handle parent relationship
    if (updateOrgDto.parentSourcedId !== undefined) {
      updateData.parent = updateOrgDto.parentSourcedId
        ? { connect: { sourcedId: updateOrgDto.parentSourcedId } }
        : { disconnect: true };
      delete updateData.parentSourcedId;
    }

    const updated = await this.orgsRepository.update(sourcedId, updateData);
    return new OrgResponseDto(updated);
  }

  /**
   * Delete org by sourcedId (soft delete)
   *
   * @param sourcedId - OneRoster sourcedId
   * @throws NotFoundException if org not found
   */
  async delete(sourcedId: string): Promise<void> {
    const org = await this.orgsRepository.findBySourcedId(sourcedId);

    if (!org) {
      throw new NotFoundException(`Org with sourcedId '${sourcedId}' not found`);
    }

    // Soft delete - set status to tobedeleted
    await this.orgsRepository.update(sourcedId, {
      status: 'tobedeleted',
      dateLastModified: new Date(),
    });
  }
}
