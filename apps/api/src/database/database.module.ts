import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Database Module
 *
 * Global module that provides Prisma database access to all modules in the application.
 * Marked as @Global() so PrismaService is automatically available everywhere without repeated imports.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
