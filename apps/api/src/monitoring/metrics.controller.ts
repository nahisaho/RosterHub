/**
 * Metrics Controller
 *
 * Exposes Prometheus metrics endpoint for scraping.
 *
 * Endpoints:
 * - GET /metrics - Prometheus text format metrics
 * - GET /metrics/json - JSON format metrics summary
 */

import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /metrics
   *
   * Returns metrics in Prometheus text format for scraping.
   *
   * This endpoint is typically scraped by Prometheus every 15-30 seconds.
   */
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): string {
    return this.metricsService.getPrometheusMetrics();
  }

  /**
   * GET /metrics/json
   *
   * Returns metrics in JSON format for debugging and manual inspection.
   */
  @Get('json')
  getMetricsJson(): Record<string, any> {
    return this.metricsService.getMetricsSummary();
  }
}
