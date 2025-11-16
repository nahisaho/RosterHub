import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

// OneRoster Entity Modules
import { UsersModule } from './oneroster/entities/users/users.module';
import { OrgsModule } from './oneroster/entities/orgs/orgs.module';
import { ClassesModule } from './oneroster/entities/classes/classes.module';
import { CoursesModule } from './oneroster/entities/courses/courses.module';
import { EnrollmentsModule } from './oneroster/entities/enrollments/enrollments.module';
import { AcademicSessionsModule } from './oneroster/entities/academic-sessions/academic-sessions.module';
import { DemographicsModule } from './oneroster/entities/demographics/demographics.module';

// CSV Import/Export Module
import { CsvModule } from './oneroster/csv/csv.module';

// Monitoring Module (Prometheus metrics + Health checks)
import { MonitoringModule } from './monitoring/monitoring.module';

/**
 * App Module
 *
 * Root module for RosterHub OneRoster Japan Profile API.
 * Imports all entity modules and provides global configuration.
 */
@Module({
  imports: [
    // Configuration module (load environment variables)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),

    // BullMQ configuration (for background jobs)
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    // Common module (guards, services, caching)
    CommonModule,

    // Database module (Prisma)
    DatabaseModule,

    // Monitoring module (metrics + health checks)
    MonitoringModule,

    // OneRoster Entity Modules (Sprint 3-4)
    UsersModule,
    OrgsModule,
    ClassesModule,
    CoursesModule,
    EnrollmentsModule,
    AcademicSessionsModule,
    DemographicsModule,

    // CSV Import/Export Module
    CsvModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
