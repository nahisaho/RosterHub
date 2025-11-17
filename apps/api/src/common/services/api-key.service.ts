import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';

/**
 * API Key Service
 *
 * Provides API key validation against the database.
 * Used by ApiKeyGuard for authentication.
 * 
 * Security Features:
 * - Bcrypt hashing for secure API key storage (12 rounds)
 * - Constant-time comparison to prevent timing attacks
 * - API key expiration checking
 */
@Injectable()
export class ApiKeyService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate API key against database
   *
   * Security:
   * 1. Finds API key record from database
   * 2. Checks if key is active and not expired
   * 3. Verifies bcrypt hash (constant-time comparison)
   *
   * @param key - Plain API key from X-API-Key header
   * @returns API key record if valid and active
   * @throws Error if API key is invalid, inactive, or expired
   */
  async validate(key: string) {
    const apiKeyRecord = await this.prisma.apiKey.findUnique({
      where: { key },
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      throw new Error('Invalid API key or API key is inactive');
    }

    // Check expiration
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      throw new Error('API key has expired');
    }

    // Verify bcrypt hash (constant-time comparison prevents timing attacks)
    const isValidHash = await bcrypt.compare(key, apiKeyRecord.hashedKey);
    if (!isValidHash) {
      throw new Error('Invalid API key');
    }

    return apiKeyRecord;
  }

  /**
   * Hash API key using bcrypt
   *
   * Uses 12 rounds (2^12 iterations) which provides good security
   * while maintaining reasonable performance.
   *
   * @param key - Plain API key
   * @returns Bcrypt hash
   */
  async hashKey(key: string): Promise<string> {
    return bcrypt.hash(key, this.BCRYPT_ROUNDS);
  }

  /**
   * Create new API key with hashed storage
   *
   * @param data - API key creation data
   * @returns Created API key record
   */
  async create(data: {
    key: string;
    name: string;
    organizationId: string;
    ipWhitelist?: string[];
    rateLimit?: number;
    expiresAt?: Date;
  }) {
    const hashedKey = await this.hashKey(data.key);

    return this.prisma.apiKey.create({
      data: {
        key: data.key,
        hashedKey,
        name: data.name,
        organizationId: data.organizationId,
        ipWhitelist: data.ipWhitelist || [],
        rateLimit: data.rateLimit || 1000,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find API key by key string
   *
   * @param key - API key
   * @returns API key record or null
   */
  async findByKey(key: string) {
    return this.prisma.apiKey.findUnique({
      where: { key },
    });
  }

  /**
   * Check if API key is active
   *
   * @param key - API key
   * @returns True if key exists and is active
   */
  async isActive(key: string): Promise<boolean> {
    const apiKeyRecord = await this.findByKey(key);
    return apiKeyRecord?.isActive ?? false;
  }
}
