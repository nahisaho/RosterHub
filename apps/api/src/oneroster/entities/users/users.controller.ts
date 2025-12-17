import { Controller, Get, Param, Query, Put, Delete, Body, UseGuards, UseInterceptors, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

/**
 * Users Controller
 *
 * OneRoster Japan Profile 1.2.2 compliant REST API for user entity.
 * Handles GET operations for users (students, teachers, staff, administrators).
 *
 * Base Path: /ims/oneroster/v1p2/users
 */
@ApiTags('users')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/users')
@UseGuards(ApiKeyGuard, RateLimitGuard)
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /ims/oneroster/v1p2/users
   *
   * Retrieve all users with pagination, filtering, and sorting.
   * Supports Delta/Incremental API via dateLastModified filter.
   *
   * @param query - Query parameters (limit, offset, filter, sort, fields)
   * @returns Paginated list of users
   */
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: `
      Retrieve all users (students, teachers, staff, administrators).

      **Supports:**
      - Pagination (limit, offset)
      - Delta API (filter=dateLastModified>=timestamp)
      - Filtering (role, status)
      - Sorting (sort=field or sort=-field)
      - Field selection (fields=sourcedId,givenName,email)

      **Examples:**
      - Get active students: \`?role=student&status=active\`
      - Delta sync: \`?filter=dateLastModified>=2025-01-01T00:00:00Z\`
      - Paginated: \`?limit=100&offset=200\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async findAll(@Query() query: QueryUsersDto) {
    const result = await this.usersService.findAll(query);
    // OneRoster spec requires collection responses wrapped in entity name
    return { users: result.data };
  }

  /**
   * GET /ims/oneroster/v1p2/users/:sourcedId
   *
   * Retrieve a single user by sourcedId.
   *
   * @param sourcedId - OneRoster unique identifier
   * @returns User details
   */
  @Get(':sourcedId')
  @ApiOperation({
    summary: 'Get user by sourcedId',
    description: 'Retrieve a single user by OneRoster sourcedId.',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async findOne(
    @Param('sourcedId') sourcedId: string,
    @Query('fields') fields?: string,
  ) {
    const user = await this.usersService.findOne(sourcedId, fields);
    // OneRoster spec requires single entity wrapped in entity name
    return { user };
  }

  /**
   * PUT /ims/oneroster/v1p2/users/:sourcedId
   *
   * Update an existing user.
   *
   * @param sourcedId - OneRoster unique identifier
   * @param updateUserDto - Update data
   * @returns Updated user details
   */
  @Put(':sourcedId')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update an existing user by sourcedId.',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(sourcedId, updateUserDto);
    return { user };
  }

  /**
   * DELETE /ims/oneroster/v1p2/users/:sourcedId
   *
   * Delete a user (soft delete - sets status to 'tobedeleted').
   *
   * @param sourcedId - OneRoster unique identifier
   */
  @Delete(':sourcedId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Soft delete a user by setting status to tobedeleted.',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async delete(@Param('sourcedId') sourcedId: string) {
    await this.usersService.delete(sourcedId);
  }
}
