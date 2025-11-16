/**
 * Monitoring Module
 *
 * Provides metrics collection, health checks, and observability features.
 *
 * Features:
 * - Prometheus metrics endpoint
 * - Health check endpoints (health, ready, live)
 * - HTTP request metrics via interceptor
 * - Custom business metrics
 */

import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';

@Global() // Make MetricsService available globally
@Module({
  imports: [DatabaseModule],
  controllers: [MetricsController, HealthController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService], // Export for use in other modules
})
export class MonitoringModule {}
