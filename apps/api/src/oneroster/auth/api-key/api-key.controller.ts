import { Controller, Post, Delete, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { ApiKeyResponseDto } from '../dto/api-key-response.dto';

/**
 * Controller for API Key management
 *
 * Provides endpoints for creating, revoking, and listing API keys.
 * These endpoints are typically used by system administrators to manage
 * access credentials for external learning platforms.
 *
 * @remarks
 * All endpoints in this controller require super-admin authentication.
 * Regular API key authentication does not apply to these endpoints.
 */
@ApiTags('API Key Management')
@Controller('api/v1/auth/api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Creates a new API key
   *
   * Generates a new API key with the specified configuration.
   * The plain-text API key is returned only once in the response.
   * It is never stored in plain text and cannot be retrieved later.
   *
   * **IMPORTANT**: Save the API key immediately upon creation!
   *
   * @param createApiKeyDto - API key creation parameters
   * @returns The created API key with plain-text key (shown only once)
   *
   * @example
   * **Request:**
   * ```http
   * POST /api/v1/auth/api-keys
   * Content-Type: application/json
   *
   * {
   *   "name": "Learning Platform A - Production",
   *   "organizationId": "org-12345",
   *   "ipWhitelist": ["192.168.1.0/24", "10.0.0.5"],
   *   "rateLimit": 1000
   * }
   * ```
   *
   * **Response:**
   * ```json
   * {
   *   "id": "550e8400-e29b-41d4-a716-446655440000",
   *   "key": "rh_live_1234567890abcdef1234567890abcdef",
   *   "name": "Learning Platform A - Production",
   *   "organizationId": "org-12345",
   *   "ipWhitelist": ["192.168.1.0/24", "10.0.0.5"],
   *   "rateLimit": 1000,
   *   "isActive": true,
   *   "expiresAt": null,
   *   "createdAt": "2025-01-15T10:30:00Z",
   *   "lastUsedAt": null
   * }
   * ```
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new API key',
    description: 'Generates a new API key with specified configuration. The plain-text key is returned only once.',
  })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(@Body() createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.create(createApiKeyDto);
  }

  /**
   * Revokes an API key
   *
   * Sets the API key's status to inactive, preventing further use.
   * This is a soft delete - the record remains in the database for audit purposes.
   *
   * @param id - The API key ID to revoke
   *
   * @example
   * **Request:**
   * ```http
   * DELETE /api/v1/auth/api-keys/550e8400-e29b-41d4-a716-446655440000
   * ```
   *
   * **Response:**
   * ```http
   * HTTP/1.1 204 No Content
   * ```
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke an API key',
    description: 'Sets the API key status to inactive. This is a soft delete.',
  })
  @ApiParam({
    name: 'id',
    description: 'API key ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'API key revoked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  async revoke(@Param('id') id: string): Promise<void> {
    return this.apiKeyService.revoke(id);
  }

  /**
   * Lists API keys for an organization
   *
   * Returns all API keys (active and inactive) for the specified organization.
   * The plain-text key is never returned in list operations.
   *
   * @param organizationId - The organization ID to filter by
   * @returns Array of API key records (without plain-text keys)
   *
   * @example
   * **Request:**
   * ```http
   * GET /api/v1/auth/api-keys?organizationId=org-12345
   * ```
   *
   * **Response:**
   * ```json
   * [
   *   {
   *     "id": "550e8400-e29b-41d4-a716-446655440000",
   *     "name": "Learning Platform A - Production",
   *     "organizationId": "org-12345",
   *     "ipWhitelist": ["192.168.1.0/24"],
   *     "rateLimit": 1000,
   *     "isActive": true,
   *     "expiresAt": null,
   *     "createdAt": "2025-01-15T10:30:00Z",
   *     "lastUsedAt": "2025-01-15T12:45:00Z"
   *   },
   *   {
   *     "id": "660e8400-e29b-41d4-a716-446655440001",
   *     "name": "Learning Platform B - Test",
   *     "organizationId": "org-12345",
   *     "ipWhitelist": [],
   *     "rateLimit": 500,
   *     "isActive": false,
   *     "expiresAt": "2025-12-31T23:59:59Z",
   *     "createdAt": "2025-01-10T08:00:00Z",
   *     "lastUsedAt": null
   *   }
   * ]
   * ```
   */
  @Get()
  @ApiOperation({
    summary: 'List API keys for an organization',
    description: 'Returns all API keys for the specified organization (active and inactive)',
  })
  @ApiQuery({
    name: 'organizationId',
    description: 'Organization ID to filter API keys',
    required: true,
    example: 'org-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'API keys retrieved successfully',
    type: [ApiKeyResponseDto],
  })
  async findByOrganization(@Query('organizationId') organizationId: string): Promise<ApiKeyResponseDto[]> {
    return this.apiKeyService.findByOrganization(organizationId);
  }

  /**
   * Retrieves a single API key by ID
   *
   * Returns the API key record (without plain-text key).
   *
   * @param id - The API key ID
   * @returns API key record
   *
   * @example
   * **Request:**
   * ```http
   * GET /api/v1/auth/api-keys/550e8400-e29b-41d4-a716-446655440000
   * ```
   *
   * **Response:**
   * ```json
   * {
   *   "id": "550e8400-e29b-41d4-a716-446655440000",
   *   "name": "Learning Platform A - Production",
   *   "organizationId": "org-12345",
   *   "ipWhitelist": ["192.168.1.0/24"],
   *   "rateLimit": 1000,
   *   "isActive": true,
   *   "expiresAt": null,
   *   "createdAt": "2025-01-15T10:30:00Z",
   *   "lastUsedAt": "2025-01-15T12:45:00Z"
   * }
   * ```
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve an API key by ID',
    description: 'Returns the API key record (without plain-text key)',
  })
  @ApiParam({
    name: 'id',
    description: 'API key ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'API key retrieved successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  async findById(@Param('id') id: string): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.findById(id);
  }
}
