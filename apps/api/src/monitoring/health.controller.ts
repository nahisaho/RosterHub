/**
 * Health Check Controller
 *
 * Provides health check and readiness endpoints for container orchestration.
 *
 * Endpoints:
 * - GET /health - Simple health check (always returns 200 if app is running)
 * - GET /health/ready - Readiness check (checks dependencies)
 * - GET /health/live - Liveness check (for Kubernetes)
 */

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /health
   *
   * Basic health check endpoint.
   * Returns 200 OK if the application is running.
   *
   * Use this for simple uptime monitoring.
   */
  @Get()
  getHealth(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'oneroster-api',
      version: process.env.npm_package_version || '0.0.1',
    });
  }

  /**
   * GET /health/ready
   *
   * Readiness check endpoint.
   * Checks if the application is ready to accept traffic.
   *
   * Checks:
   * - Database connection
   * - Redis connection (if configured)
   *
   * Use this for Kubernetes readiness probes.
   */
  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const checks: Record<string, any> = {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
    };

    let allHealthy = true;

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latency: 0, // Could measure actual latency
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error.message,
      };
      allHealthy = false;
    }

    // Check Redis connection (if using cache)
    // TODO: Implement Redis health check when cache module is integrated
    checks.redis = {
      status: 'not_configured',
    };

    const statusCode = allHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  /**
   * GET /health/live
   *
   * Liveness check endpoint.
   * Indicates whether the application is alive and should not be restarted.
   *
   * This should only fail if the application is in an unrecoverable state.
   *
   * Use this for Kubernetes liveness probes.
   */
  @Get('live')
  getLiveness(@Res() res: Response) {
    // Simple liveness check - just return 200 if we can respond
    // In a real scenario, you might check for deadlocks, memory leaks, etc.

    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 1024 * 1024 * 1024; // 1GB

    const isAlive = memoryUsage.heapUsed < memoryThreshold;

    const statusCode = isAlive ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status: isAlive ? 'alive' : 'unhealthy',
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
      uptime: process.uptime(),
    });
  }
}
