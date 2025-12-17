import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserResponseDto } from './dto/user-response.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterParserService } from '../../common/services/filter-parser.service';
import { FieldSelectionService } from '../../common/services/field-selection.service';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

/**
 * Users Service
 *
 * Business logic for user operations.
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
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly filterParser: FilterParserService,
    private readonly fieldSelection: FieldSelectionService,
  ) {}

  /**
   * Get all users with pagination, filtering, sorting, and field selection
   *
   * @param query - Query parameters (limit, offset, filter, sort, orderBy, fields)
   * @returns Paginated users with metadata
   */
  async findAll(query: QueryUsersDto): Promise<PaginatedResponse<UserResponseDto>> {
    const { limit = 100, offset = 0, filter, sort, orderBy = 'asc', fields } = query;

    // Parse OneRoster filter expression
    const filterableFields = this.fieldSelection.getFilterableFields('users');
    const whereClause = filter
      ? this.filterParser.parseFilter(filter, filterableFields)
      : {};

    // Build Prisma orderBy clause
    const sortableFields = this.fieldSelection.getSortableFields('users');
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
    // This ensures UserResponseDto always receives complete entities
    // Prisma select would return partial entities, breaking the DTO constructor

    // Fetch users from repository (always fetch all fields)
    const users = await this.usersRepository.findAll({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    });

    // Count total records for pagination
    const total = await this.usersRepository.count({ where: whereClause });

    // Convert to DTOs
    const userDtos = users.map((user) => new UserResponseDto(user));

    // Apply field filtering if selection was requested
    const filteredDtos = fields
      ? this.fieldSelection.filterEntities(userDtos, fields)
      : userDtos;

    return new PaginatedResponse(filteredDtos, total, offset, limit);
  }

  /**
   * Get user by sourcedId
   *
   * @param sourcedId - OneRoster sourcedId
   * @param fields - Optional field selection (comma-separated)
   * @returns User details
   * @throws NotFoundException if user not found
   */
  async findOne(sourcedId: string, fields?: string): Promise<UserResponseDto | any> {
    const user = await this.usersRepository.findBySourcedId(sourcedId);

    if (!user) {
      throw new NotFoundException(`User with sourcedId '${sourcedId}' not found`);
    }

    const userDto = new UserResponseDto(user);

    // Apply field filtering if selection was requested
    if (fields) {
      return this.fieldSelection.filterEntity(userDto, fields);
    }

    return userDto;
  }

  /**
   * Update user by sourcedId
   *
   * @param sourcedId - OneRoster sourcedId
   * @param updateUserDto - Update data
   * @returns Updated user details
   * @throws NotFoundException if user not found
   */
  async update(sourcedId: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findBySourcedId(sourcedId);

    if (!user) {
      throw new NotFoundException(`User with sourcedId '${sourcedId}' not found`);
    }

    const updateData: any = {
      ...updateUserDto,
      dateLastModified: new Date(),
    };

    const updated = await this.usersRepository.update(sourcedId, updateData);
    return new UserResponseDto(updated);
  }

  /**
   * Delete user by sourcedId (soft delete)
   *
   * @param sourcedId - OneRoster sourcedId
   * @throws NotFoundException if user not found
   */
  async delete(sourcedId: string): Promise<void> {
    const user = await this.usersRepository.findBySourcedId(sourcedId);

    if (!user) {
      throw new NotFoundException(`User with sourcedId '${sourcedId}' not found`);
    }

    // Soft delete - set status to tobedeleted
    await this.usersRepository.update(sourcedId, {
      status: 'tobedeleted',
      dateLastModified: new Date(),
    });
  }
}
