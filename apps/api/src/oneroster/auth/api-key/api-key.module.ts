import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { DatabaseModule } from '../../../database/database.module';

/**
 * API Key Management Module
 *
 * Provides API key generation, validation, revocation, and listing functionality.
 * This module is used for managing API keys for external learning platform integrations.
 *
 * @module ApiKeyModule
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyRepository],
  exports: [ApiKeyService], // Export for use in guards
})
export class ApiKeyModule {}
