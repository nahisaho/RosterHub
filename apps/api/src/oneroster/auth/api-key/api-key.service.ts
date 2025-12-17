import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { ApiKeyResponseDto } from '../dto/api-key-response.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

/**
 * Service for API Key management
 *
 * Handles API key creation, validation, revocation, and listing.
 * Uses bcrypt for secure key hashing and crypto for random key generation.
 */
@Injectable()
export class ApiKeyService {
  /**
   * Number of salt rounds for bcrypt hashing
   * 12 rounds provides a good balance between security and performance
   */
  private readonly BCRYPT_SALT_ROUNDS = 12;

  /**
   * Length of the random portion of the API key
   * 32 bytes = 64 hex characters
   */
  private readonly KEY_LENGTH = 32;

  /**
   * Prefix for production API keys
   */
  private readonly PROD_PREFIX = 'rh_live_';

  /**
   * Prefix for test/development API keys
   */
  private readonly TEST_PREFIX = 'rh_test_';

  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  /**
   * Generates a new API key
   *
   * Creates a cryptographically secure random API key with the following format:
   * - Production: `rh_live_{64_hex_characters}`
   * - Test: `rh_test_{64_hex_characters}`
   *
   * @param createApiKeyDto - Data for creating the API key
   * @returns API key response with the plain-text key (only shown once)
   *
   * @example
   * ```typescript
   * const apiKey = await apiKeyService.create({
   *   name: 'Learning Platform A',
   *   organizationId: 'org-12345',
   *   ipWhitelist: ['192.168.1.0/24'],
   *   rateLimit: 1000,
   * });
   * console.log(apiKey.key); // "rh_live_1234567890abcdef..."
   * ```
   */
  async create(createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    // Generate random API key
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const randomString = randomBytes.toString('hex');

    // Determine environment (production vs test)
    const isProduction = process.env.NODE_ENV === 'production';
    const prefix = isProduction ? this.PROD_PREFIX : this.TEST_PREFIX;

    // Construct full API key
    const apiKey = `${prefix}${randomString}`;

    // Hash the API key using bcrypt
    const hashedKey = await bcrypt.hash(apiKey, this.BCRYPT_SALT_ROUNDS);

    // Create API key record in database
    const createdApiKey = await this.apiKeyRepository.create({
      key: apiKey, // Store plain key temporarily for response
      hashedKey,
      name: createApiKeyDto.name,
      organizationId: createApiKeyDto.organizationId,
      ipWhitelist: createApiKeyDto.ipWhitelist || [],
      rateLimit: createApiKeyDto.rateLimit || 1000,
      isActive: true,
      expiresAt: createApiKeyDto.expiresAt || null,
    });

    // Return response with plain-text key (only shown once)
    return new ApiKeyResponseDto({
      id: createdApiKey.id,
      key: apiKey, // Plain-text key (IMPORTANT: only shown once)
      name: createdApiKey.name,
      organizationId: createdApiKey.organizationId,
      ipWhitelist: createdApiKey.ipWhitelist,
      rateLimit: createdApiKey.rateLimit,
      isActive: createdApiKey.isActive,
      expiresAt: createdApiKey.expiresAt,
      createdAt: createdApiKey.createdAt,
      lastUsedAt: createdApiKey.lastUsedAt,
    });
  }

  /**
   * Validates an API key
   *
   * Checks if the provided API key is valid, active, and not expired.
   * Uses bcrypt to compare the provided key with the hashed key in the database.
   * Updates the `lastUsedAt` timestamp upon successful validation.
   *
   * @param apiKey - The API key to validate
   * @returns API key record if valid, null if invalid
   *
   * @throws {UnauthorizedException} If the API key is invalid, inactive, or expired
   *
   * @example
   * ```typescript
   * const apiKeyRecord = await apiKeyService.validate('rh_live_1234567890abcdef...');
   * console.log(apiKeyRecord.organizationId); // "org-12345"
   * ```
   */
  async validate(apiKey: string): Promise<any> {
    // Find all API keys (we need to hash-compare each one)
    // Note: This is inefficient for large numbers of API keys
    // Consider adding a prefix-based index or using a different approach
    const apiKeys = await this.apiKeyRepository.findAllActive();

    // Find the matching API key by comparing hashes
    let matchedApiKey = null;
    for (const record of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, record.hashedKey);
      if (isMatch) {
        matchedApiKey = record;
        break;
      }
    }

    // If no match found, throw unauthorized
    if (!matchedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check if the API key is active
    if (!matchedApiKey.isActive) {
      throw new UnauthorizedException('API key is inactive');
    }

    // Check if the API key has expired
    if (matchedApiKey.expiresAt && new Date() > matchedApiKey.expiresAt) {
      throw new UnauthorizedException('API key has expired');
    }

    // Update last used timestamp
    await this.apiKeyRepository.updateLastUsed(matchedApiKey.id);

    return matchedApiKey;
  }

  /**
   * Revokes an API key
   *
   * Sets the API key's `isActive` status to `false`, preventing further use.
   * This is a soft delete - the record remains in the database for audit purposes.
   *
   * @param id - The API key ID to revoke
   *
   * @throws {NotFoundException} If the API key is not found
   *
   * @example
   * ```typescript
   * await apiKeyService.revoke('550e8400-e29b-41d4-a716-446655440000');
   * ```
   */
  async revoke(id: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findById(id);

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    await this.apiKeyRepository.revoke(id);
  }

  /**
   * Lists all API keys for an organization
   *
   * Returns all API keys (active and inactive) for the specified organization.
   * The plain-text key is never returned in list operations (only on creation).
   *
   * @param organizationId - The organization ID to filter by
   * @returns Array of API key response DTOs (without plain-text keys)
   *
   * @example
   * ```typescript
   * const apiKeys = await apiKeyService.findByOrganization('org-12345');
   * console.log(apiKeys.length); // 3
   * ```
   */
  async findByOrganization(
    organizationId: string,
  ): Promise<ApiKeyResponseDto[]> {
    const apiKeys =
      await this.apiKeyRepository.findByOrganization(organizationId);

    return apiKeys.map(
      (apiKey) =>
        new ApiKeyResponseDto({
          id: apiKey.id,
          // key: undefined, // Never return plain-text key in list operations
          name: apiKey.name,
          organizationId: apiKey.organizationId,
          ipWhitelist: apiKey.ipWhitelist,
          rateLimit: apiKey.rateLimit,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
          lastUsedAt: apiKey.lastUsedAt,
        }),
    );
  }

  /**
   * Retrieves a single API key by ID
   *
   * Returns the API key record (without plain-text key).
   *
   * @param id - The API key ID
   * @returns API key response DTO
   *
   * @throws {NotFoundException} If the API key is not found
   *
   * @example
   * ```typescript
   * const apiKey = await apiKeyService.findById('550e8400-e29b-41d4-a716-446655440000');
   * console.log(apiKey.name); // "Learning Platform A"
   * ```
   */
  async findById(id: string): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepository.findById(id);

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    return new ApiKeyResponseDto({
      id: apiKey.id,
      // key: undefined, // Never return plain-text key
      name: apiKey.name,
      organizationId: apiKey.organizationId,
      ipWhitelist: apiKey.ipWhitelist,
      rateLimit: apiKey.rateLimit,
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
    });
  }
}
