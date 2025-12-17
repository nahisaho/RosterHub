import {
  Controller,
  Get,
  Param,
  Query,
  Put,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { OrgsService } from './orgs.service';
import { OrgResponseDto } from './dto/org-response.dto';
import { QueryOrgsDto } from './dto/query-orgs.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

/**
 * Orgs Controller
 *
 * OneRoster Japan Profile 1.2.2 compliant REST API for organization entity.
 * Handles GET operations for organizations (schools, districts, departments).
 *
 * Base Path: /ims/oneroster/v1p2/orgs
 */
@ApiTags('orgs')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/orgs')
@UseGuards(ApiKeyGuard, RateLimitGuard)
@UseInterceptors(AuditInterceptor)
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  /**
   * GET /ims/oneroster/v1p2/orgs
   *
   * Retrieve all organizations with pagination, filtering, and sorting.
   * Supports Delta/Incremental API via dateLastModified filter.
   *
   * @param query - Query parameters (limit, offset, filter, sort, fields)
   * @returns Paginated list of organizations
   */
  @Get()
  @ApiOperation({
    summary: 'Get all organizations',
    description: `
      Retrieve all organizations (schools, districts, departments).

      **Supports:**
      - Pagination (limit, offset)
      - Delta API (filter=dateLastModified>=timestamp)
      - Filtering (type, status)
      - Sorting (sort=field or sort=-field)
      - Field selection (fields=sourcedId,name,type)

      **Examples:**
      - Get schools: \`?type=school&status=active\`
      - Delta sync: \`?filter=dateLastModified>=2025-01-01T00:00:00Z\`
      - Paginated: \`?limit=100&offset=0\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
    type: [OrgResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async findAll(@Query() query: QueryOrgsDto) {
    const result = await this.orgsService.findAll(query);
    // OneRoster spec requires collection responses wrapped in entity name
    return { orgs: result.data, pagination: result.pagination };
  }

  /**
   * GET /ims/oneroster/v1p2/orgs/:sourcedId
   *
   * Retrieve a single organization by sourcedId.
   *
   * @param sourcedId - OneRoster unique identifier
   * @returns Org details
   */
  @Get(':sourcedId')
  @ApiOperation({
    summary: 'Get organization by sourcedId',
    description: 'Retrieve a single organization by OneRoster sourcedId.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
    type: OrgResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async findOne(
    @Param('sourcedId') sourcedId: string,
    @Query('fields') fields?: string,
  ) {
    const org = await this.orgsService.findOne(sourcedId, fields);
    // OneRoster spec requires single entity wrapped in entity name
    return { org };
  }

  /**
   * PUT /ims/oneroster/v1p2/orgs/:sourcedId
   *
   * Update an existing organization.
   *
   * @param sourcedId - OneRoster unique identifier
   * @param updateOrgDto - Update data
   * @returns Updated org details
   */
  @Put(':sourcedId')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Update an existing organization by sourcedId.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrgResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateOrgDto: UpdateOrgDto,
  ) {
    const org = await this.orgsService.update(sourcedId, updateOrgDto);
    return { org };
  }

  /**
   * DELETE /ims/oneroster/v1p2/orgs/:sourcedId
   *
   * Delete an organization (soft delete - sets status to 'tobedeleted').
   *
   * @param sourcedId - OneRoster unique identifier
   */
  @Delete(':sourcedId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete organization',
    description:
      'Soft delete an organization by setting status to tobedeleted.',
  })
  @ApiResponse({
    status: 204,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid API key',
  })
  async delete(@Param('sourcedId') sourcedId: string) {
    await this.orgsService.delete(sourcedId);
  }
}
