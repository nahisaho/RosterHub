import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis-yet';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { DatabaseModule } from '../database/database.module';

/**
 * Common Module (Global)
 *
 * Provides common services, guards, and interceptors that are shared
 * across all modules in the application.
 *
 * Exports:
 * - ApiKeyService (for API key validation)
 * - ApiKeyGuard (for authentication)
 * - CacheModule (Redis caching)
 */
@Global()
@Module({
  imports: [
    DatabaseModule,
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      ttl: 300, // Default TTL: 5 minutes
    }),
  ],
  providers: [
    ApiKeyService,
    ApiKeyGuard,
    {
      provide: 'API_KEY_SERVICE',
      useExisting: ApiKeyService,
    },
  ],
  exports: [ApiKeyService, ApiKeyGuard, 'API_KEY_SERVICE', CacheModule],
})
export class CommonModule {}
