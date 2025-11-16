/**
 * K6 Quick Performance Test
 *
 * Fast performance validation for CI/CD pipelines.
 * Runs in ~2 minutes with basic load scenarios.
 *
 * Usage:
 *   k6 run test/performance/quick-test.js
 *   k6 run --env BASE_URL=https://api.example.com test/performance/quick-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test_api_key_12345';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 50 },    // Stay at load
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.05'],
  },
};

function makeRequest(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const response = http.get(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
  apiLatency.add(response.timings.duration);

  return response;
}

export default function () {
  // Test key endpoints
  const scenario = Math.random();

  if (scenario < 0.4) {
    makeRequest('/api/v1/users?limit=100');
  } else if (scenario < 0.7) {
    makeRequest('/api/v1/enrollments?limit=100');
  } else if (scenario < 0.9) {
    makeRequest('/api/v1/orgs?limit=50');
  } else {
    makeRequest('/api/v1/classes?limit=50');
  }

  sleep(1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const errorRate = data.metrics.http_req_failed.values.rate;

  console.log(`
╔═══════════════════════════════════════════════════════╗
║          Quick Performance Test Results              ║
╚═══════════════════════════════════════════════════════╝

Total Requests:     ${data.metrics.http_reqs.values.count}
Failed Requests:    ${data.metrics.http_req_failed.values.passes} (${(errorRate * 100).toFixed(2)}%)

Response Times:
  Average:          ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  P95:              ${p95.toFixed(2)}ms ${p95 < 500 ? '✓' : '✗'}
  P99:              ${p99.toFixed(2)}ms ${p99 < 1000 ? '✓' : '✗'}
  Max:              ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Thresholds:
  ${p95 < 500 ? '✓' : '✗'} P95 < 500ms
  ${p99 < 1000 ? '✓' : '✗'} P99 < 1000ms
  ${errorRate < 0.01 ? '✓' : '✗'} Error Rate < 1%

Status: ${p95 < 500 && p99 < 1000 && errorRate < 0.01 ? '✅ PASS' : '❌ FAIL'}
`);

  return {
    'stdout': '',
  };
}
