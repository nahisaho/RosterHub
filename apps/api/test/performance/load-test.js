/**
 * K6 Load Testing Suite
 *
 * Comprehensive performance testing for RosterHub API endpoints.
 * Tests baseline performance, load capacity, and stress scenarios.
 *
 * Usage:
 *   k6 run test/performance/load-test.js
 *   k6 run --vus 50 --duration 5m test/performance/load-test.js
 *
 * Output formats:
 *   k6 run --out json=results.json test/performance/load-test.js
 *   k6 run --out influxdb=http://localhost:8086/k6 test/performance/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================
// Configuration
// ============================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test_api_key_12345';

// ============================================
// Custom Metrics
// ============================================

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const dbQueryTime = new Trend('db_query_time');
const cacheHitRate = new Rate('cache_hits');
const requestsPerSecond = new Counter('requests_total');

// ============================================
// Test Scenarios
// ============================================

export const options = {
  scenarios: {
    // Scenario 1: Baseline Performance (low load)
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '0s',
      tags: { scenario: 'baseline' },
    },

    // Scenario 2: Load Test (normal load)
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 VUs
        { duration: '3m', target: 50 },   // Stay at 50 VUs
        { duration: '1m', target: 100 },  // Ramp up to 100 VUs
        { duration: '3m', target: 100 },  // Stay at 100 VUs
        { duration: '1m', target: 0 },    // Ramp down to 0
      ],
      startTime: '2m',
      tags: { scenario: 'load' },
    },

    // Scenario 3: Stress Test (high load)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },  // Ramp up to 200 VUs
        { duration: '5m', target: 200 },  // Stay at 200 VUs
        { duration: '2m', target: 300 },  // Ramp up to 300 VUs
        { duration: '5m', target: 300 },  // Stay at 300 VUs
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
      startTime: '11m',
      tags: { scenario: 'stress' },
    },

    // Scenario 4: Spike Test (sudden traffic spike)
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Spike to 500 VUs
        { duration: '1m', target: 500 },   // Maintain spike
        { duration: '10s', target: 0 },    // Drop back to 0
      ],
      startTime: '27m',
      tags: { scenario: 'spike' },
    },

    // Scenario 5: Soak Test (sustained load)
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      startTime: '29m',
      tags: { scenario: 'soak' },
    },
  },

  // Performance thresholds (SLOs)
  thresholds: {
    'http_req_duration': [
      'p(95)<500',  // 95% of requests should be below 500ms
      'p(99)<1000', // 99% of requests should be below 1s
    ],
    'http_req_failed': ['rate<0.01'],  // Error rate should be less than 1%
    'errors': ['rate<0.05'],  // Custom error rate should be less than 5%
    'cache_hits': ['rate>0.50'],  // Cache hit rate should be above 50%
  },
};

// ============================================
// Test Data
// ============================================

const testUsers = ['user001', 'user002', 'user003', 'user004', 'user005'];
const testOrgs = ['org001', 'org002', 'org003'];
const testClasses = ['class001', 'class002', 'class003'];

// ============================================
// Helper Functions
// ============================================

function getHeaders() {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function makeRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers: getHeaders(),
    tags: { endpoint },
  };

  const startTime = Date.now();
  let response;

  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(body), params);
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    response = http.del(url, params);
  }

  const duration = Date.now() - startTime;

  // Record metrics
  requestsPerSecond.add(1);
  apiLatency.add(duration);

  // Check for errors
  const success = check(response, {
    'status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);

  // Check for cache headers
  if (response.headers['X-Cache-Hit']) {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }

  return response;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ============================================
// Test Scenarios
// ============================================

export default function () {
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - List users
    makeRequest('GET', '/api/v1/users?limit=100&offset=0');
    sleep(1);
  } else if (scenario < 0.5) {
    // 20% - Get specific user
    const userId = randomItem(testUsers);
    makeRequest('GET', `/api/v1/users/${userId}`);
    sleep(0.5);
  } else if (scenario < 0.65) {
    // 15% - List enrollments
    makeRequest('GET', '/api/v1/enrollments?limit=100&offset=0');
    sleep(1);
  } else if (scenario < 0.75) {
    // 10% - Get class enrollments
    const classId = randomItem(testClasses);
    makeRequest('GET', `/api/v1/classes/${classId}/enrollments`);
    sleep(0.5);
  } else if (scenario < 0.85) {
    // 10% - List organizations
    makeRequest('GET', '/api/v1/orgs?limit=50&offset=0');
    sleep(1);
  } else if (scenario < 0.92) {
    // 7% - Delta sync (modified since)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    makeRequest('GET', `/api/v1/users?filter=dateLastModified>${yesterday}`);
    sleep(1);
  } else if (scenario < 0.97) {
    // 5% - Complex filter query
    makeRequest('GET', '/api/v1/users?filter=role=teacher AND status=active&limit=50');
    sleep(1);
  } else {
    // 3% - Create user (write operation)
    const newUser = {
      sourcedId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: `testuser_${Date.now()}`,
      givenName: 'Test',
      familyName: 'User',
      email: `test_${Date.now()}@example.com`,
      role: 'student',
      enabledUser: true,
      identifier: `test_id_${Date.now()}`,
    };
    makeRequest('POST', '/api/v1/users', newUser);
    sleep(1);
  }
}

// ============================================
// Test Lifecycle Hooks
// ============================================

export function setup() {
  console.log('Starting performance tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test duration: ~60 minutes`);

  // Warmup request
  makeRequest('GET', '/api/v1/health');

  return { startTime: new Date() };
}

export function teardown(data) {
  console.log('Performance tests completed');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date()}`);
}

// ============================================
// Custom Summary
// ============================================

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;

  return `
${indent}Performance Test Summary
${indent}========================

${indent}Scenarios:
${indent}  - Baseline:  10 VUs for 2 minutes
${indent}  - Load:      50-100 VUs ramping over 9 minutes
${indent}  - Stress:    200-300 VUs ramping over 16 minutes
${indent}  - Spike:     500 VUs for 1 minute
${indent}  - Soak:      50 VUs for 30 minutes

${indent}Metrics:
${indent}  - Total Requests:  ${data.metrics.requests_total.values.count}
${indent}  - Failed Requests: ${data.metrics.http_req_failed.values.passes} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)
${indent}  - Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  - P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  - P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  - Cache Hit Rate: ${(data.metrics.cache_hits.values.rate * 100).toFixed(2)}%

${indent}Thresholds:
${indent}  ✓ P95 < 500ms: ${data.metrics.http_req_duration.values['p(95)'] < 500 ? 'PASS' : 'FAIL'}
${indent}  ✓ P99 < 1000ms: ${data.metrics.http_req_duration.values['p(99)'] < 1000 ? 'PASS' : 'FAIL'}
${indent}  ✓ Error Rate < 1%: ${data.metrics.http_req_failed.values.rate < 0.01 ? 'PASS' : 'FAIL'}
${indent}  ✓ Cache Hit > 50%: ${data.metrics.cache_hits.values.rate > 0.50 ? 'PASS' : 'FAIL'}
`;
}
