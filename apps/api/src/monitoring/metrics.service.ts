/**
 * Prometheus Metrics Service
 *
 * Provides custom metrics collection for OneRoster API monitoring.
 *
 * Metrics Categories:
 * - HTTP Request metrics (response time, status codes, throughput)
 * - Business metrics (entities created/updated/deleted)
 * - System metrics (database connections, cache hit rate)
 * - CSV operation metrics (import/export)
 */

import { Injectable } from '@nestjs/common';

/**
 * Metric types supported by Prometheus
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Histogram bucket configuration for response time metrics
 */
const RESPONSE_TIME_BUCKETS = [
  0.005, // 5ms
  0.01, // 10ms
  0.025, // 25ms
  0.05, // 50ms
  0.1, // 100ms
  0.25, // 250ms
  0.5, // 500ms
  1, // 1s
  2.5, // 2.5s
  5, // 5s
  10, // 10s
];

/**
 * Metric definition interface
 */
interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
  buckets?: number[];
}

/**
 * In-memory metric storage (simple implementation)
 * In production, use @willsoto/nestjs-prometheus or prom-client
 */
interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, MetricValue[]> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();

  constructor() {
    this.registerDefaultMetrics();
  }

  /**
   * Register default OneRoster API metrics
   */
  private registerDefaultMetrics(): void {
    // HTTP Request Metrics
    this.registerMetric({
      name: 'oneroster_http_requests_total',
      type: MetricType.COUNTER,
      help: 'Total number of HTTP requests',
      labels: ['method', 'endpoint', 'status'],
    });

    this.registerMetric({
      name: 'oneroster_http_request_duration_seconds',
      type: MetricType.HISTOGRAM,
      help: 'HTTP request duration in seconds',
      labels: ['method', 'endpoint', 'status'],
      buckets: RESPONSE_TIME_BUCKETS,
    });

    // Entity Operation Metrics
    this.registerMetric({
      name: 'oneroster_entity_operations_total',
      type: MetricType.COUNTER,
      help: 'Total number of entity operations',
      labels: ['entity', 'operation'], // operation: create, read, update, delete
    });

    this.registerMetric({
      name: 'oneroster_entities_total',
      type: MetricType.GAUGE,
      help: 'Current total count of entities by type',
      labels: ['entity', 'status'],
    });

    // CSV Operation Metrics
    this.registerMetric({
      name: 'oneroster_csv_import_total',
      type: MetricType.COUNTER,
      help: 'Total number of CSV import operations',
      labels: ['entity', 'status'], // status: success, failed
    });

    this.registerMetric({
      name: 'oneroster_csv_export_total',
      type: MetricType.COUNTER,
      help: 'Total number of CSV export operations',
      labels: ['entity', 'status'],
    });

    this.registerMetric({
      name: 'oneroster_csv_records_processed',
      type: MetricType.COUNTER,
      help: 'Total number of CSV records processed',
      labels: ['entity', 'operation'], // operation: import, export
    });

    this.registerMetric({
      name: 'oneroster_csv_processing_duration_seconds',
      type: MetricType.HISTOGRAM,
      help: 'CSV processing duration in seconds',
      labels: ['entity', 'operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    });

    // Database Metrics
    this.registerMetric({
      name: 'oneroster_db_query_duration_seconds',
      type: MetricType.HISTOGRAM,
      help: 'Database query duration in seconds',
      labels: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    });

    this.registerMetric({
      name: 'oneroster_db_connections',
      type: MetricType.GAUGE,
      help: 'Current number of database connections',
      labels: ['state'], // state: active, idle
    });

    // Cache Metrics
    this.registerMetric({
      name: 'oneroster_cache_operations_total',
      type: MetricType.COUNTER,
      help: 'Total number of cache operations',
      labels: ['operation', 'result'], // operation: get, set, del; result: hit, miss
    });

    this.registerMetric({
      name: 'oneroster_cache_hit_rate',
      type: MetricType.GAUGE,
      help: 'Cache hit rate (0-1)',
    });

    // API Key Metrics
    this.registerMetric({
      name: 'oneroster_api_key_requests_total',
      type: MetricType.COUNTER,
      help: 'Total number of requests per API key',
      labels: ['key_id', 'status'], // status: valid, invalid, expired
    });

    // Error Metrics
    this.registerMetric({
      name: 'oneroster_errors_total',
      type: MetricType.COUNTER,
      help: 'Total number of errors',
      labels: ['type', 'endpoint'], // type: validation, database, internal, etc.
    });

    // Japan Profile Metrics
    this.registerMetric({
      name: 'oneroster_japan_profile_validations_total',
      type: MetricType.COUNTER,
      help: 'Total number of Japan Profile metadata validations',
      labels: ['entity', 'field', 'result'], // result: pass, fail
    });
  }

  /**
   * Register a new metric
   */
  registerMetric(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);
    this.metrics.set(definition.name, []);
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const existing = this.getMetricValue(name, labels);
    this.recordMetric(name, (existing?.value || 0) + 1, labels);
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    endpoint: string,
    status: number,
    durationMs: number,
  ): void {
    const labels = {
      method: method.toUpperCase(),
      endpoint: this.normalizeEndpoint(endpoint),
      status: String(status),
    };

    this.incrementCounter('oneroster_http_requests_total', labels);
    this.observeHistogram(
      'oneroster_http_request_duration_seconds',
      durationMs / 1000,
      labels,
    );
  }

  /**
   * Record entity operation
   */
  recordEntityOperation(
    entity: string,
    operation: 'create' | 'read' | 'update' | 'delete',
  ): void {
    this.incrementCounter('oneroster_entity_operations_total', {
      entity,
      operation,
    });
  }

  /**
   * Update entity count
   */
  updateEntityCount(entity: string, status: string, count: number): void {
    this.setGauge('oneroster_entities_total', count, { entity, status });
  }

  /**
   * Record CSV import operation
   */
  recordCsvImport(
    entity: string,
    status: 'success' | 'failed',
    recordCount: number,
    durationMs: number,
  ): void {
    this.incrementCounter('oneroster_csv_import_total', { entity, status });
    this.incrementCounter('oneroster_csv_records_processed', {
      entity,
      operation: 'import',
    });
    this.observeHistogram('oneroster_csv_processing_duration_seconds', durationMs / 1000, {
      entity,
      operation: 'import',
    });
  }

  /**
   * Record CSV export operation
   */
  recordCsvExport(
    entity: string,
    status: 'success' | 'failed',
    recordCount: number,
    durationMs: number,
  ): void {
    this.incrementCounter('oneroster_csv_export_total', { entity, status });
    this.incrementCounter('oneroster_csv_records_processed', {
      entity,
      operation: 'export',
    });
    this.observeHistogram('oneroster_csv_processing_duration_seconds', durationMs / 1000, {
      entity,
      operation: 'export',
    });
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    durationMs: number,
  ): void {
    this.observeHistogram('oneroster_db_query_duration_seconds', durationMs / 1000, {
      operation,
      table,
    });
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(
    operation: 'get' | 'set' | 'del',
    result: 'hit' | 'miss',
  ): void {
    this.incrementCounter('oneroster_cache_operations_total', {
      operation,
      result,
    });
  }

  /**
   * Record API key usage
   */
  recordApiKeyUsage(
    keyId: string,
    status: 'valid' | 'invalid' | 'expired',
  ): void {
    this.incrementCounter('oneroster_api_key_requests_total', {
      key_id: keyId,
      status,
    });
  }

  /**
   * Record error
   */
  recordError(type: string, endpoint: string): void {
    this.incrementCounter('oneroster_errors_total', { type, endpoint });
  }

  /**
   * Record Japan Profile validation
   */
  recordJapanProfileValidation(
    entity: string,
    field: string,
    result: 'pass' | 'fail',
  ): void {
    this.incrementCounter('oneroster_japan_profile_validations_total', {
      entity,
      field,
      result,
    });
  }

  /**
   * Get all metrics in Prometheus text format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    for (const [name, definition] of this.definitions.entries()) {
      // Add HELP line
      lines.push(`# HELP ${name} ${definition.help}`);

      // Add TYPE line
      lines.push(`# TYPE ${name} ${definition.type}`);

      // Add metric values
      const values = this.metrics.get(name) || [];
      for (const metricValue of values) {
        const labelStr = metricValue.labels
          ? Object.entries(metricValue.labels)
              .map(([key, value]) => `${key}="${value}"`)
              .join(',')
          : '';

        const metricLine = labelStr
          ? `${name}{${labelStr}} ${metricValue.value}`
          : `${name} ${metricValue.value}`;

        lines.push(metricLine);
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Get metrics summary in JSON format
   */
  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [name, values] of this.metrics.entries()) {
      summary[name] = values.map((v) => ({
        value: v.value,
        labels: v.labels,
        timestamp: v.timestamp,
      }));
    }

    return summary;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    for (const key of this.metrics.keys()) {
      this.metrics.set(key, []);
    }
  }

  /**
   * Private helper: Record metric value
   */
  private recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    const values = this.metrics.get(name) || [];
    const labelKey = labels ? JSON.stringify(labels) : '';

    // Find existing metric with same labels
    const existingIndex = values.findIndex(
      (v) => JSON.stringify(v.labels) === labelKey,
    );

    const metricValue: MetricValue = {
      value,
      labels,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      values[existingIndex] = metricValue;
    } else {
      values.push(metricValue);
    }

    this.metrics.set(name, values);
  }

  /**
   * Private helper: Get metric value
   */
  private getMetricValue(
    name: string,
    labels?: Record<string, string>,
  ): MetricValue | undefined {
    const values = this.metrics.get(name) || [];
    const labelKey = labels ? JSON.stringify(labels) : '';

    return values.find((v) => JSON.stringify(v.labels) === labelKey);
  }

  /**
   * Private helper: Normalize endpoint for consistent labeling
   */
  private normalizeEndpoint(endpoint: string): string {
    // Replace sourcedIds with :id placeholder
    return endpoint
      .replace(/\/[a-f0-9-]{36,}/gi, '/:id') // UUIDs
      .replace(/\/[a-z0-9-]{6,}/gi, '/:id') // Custom sourcedIds
      .replace(/\?.*$/, ''); // Remove query parameters
  }
}
