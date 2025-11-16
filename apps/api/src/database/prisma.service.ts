import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service
 *
 * Provides database access via Prisma ORM for the entire application.
 * Implements connection lifecycle management (connect on module init, disconnect on module destroy).
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository {
 *   constructor(private readonly prisma: PrismaService) {}
 *
 *   async findAll() {
 *     return this.prisma.user.findMany();
 *   }
 * }
 * ```
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      // Connection pool configuration for optimal performance
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Performance tuning based on PostgreSQL best practices
      // Connection pool: 10 connections per instance (adjust based on deployment)
      // Formula: (num_cpu_cores * 2) + effective_spindle_count
      // For containerized environments: typically 10-20 connections
    });

    // Log slow queries (> 1 second) for performance monitoring
    this.$on('query' as any, (e: any) => {
      if (e.duration > 1000) {
        this.logger.warn(`Slow query detected: ${e.query} (${e.duration}ms)`);
      }
    });

    // Log all errors
    this.$on('error' as any, (e: any) => {
      this.logger.error(`Database error: ${e.message}`);
    });

    // Log warnings
    this.$on('warn' as any, (e: any) => {
      this.logger.warn(`Database warning: ${e.message}`);
    });
  }

  /**
   * Connect to database on module initialization
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Disconnect from database on module destruction
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect from database', error);
    }
  }

  /**
   * Clean database (for testing purposes only)
   * WARNING: This will delete all data!
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    const models = Object.keys(this).filter(
      (key) => !key.startsWith('_') && !key.startsWith('$')
    );

    return Promise.all(
      models.map((model) => {
        // @ts-expect-error - Dynamic model access
        return this[model].deleteMany();
      })
    );
  }
}
