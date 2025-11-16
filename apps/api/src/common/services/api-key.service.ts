import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * API Key Service
 *
 * Provides API key validation against the database.
 * Used by ApiKeyGuard for authentication.
 */
@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate API key against database
   *
   * @param key - API key from X-API-Key header
   * @returns API key record if valid and active
   * @throws Error if API key is invalid or inactive
   */
  async validate(key: string) {
    const apiKeyRecord = await this.prisma.apiKey.findUnique({
      where: { key },
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      throw new Error('Invalid API key or API key is inactive');
    }

    return apiKeyRecord;
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
