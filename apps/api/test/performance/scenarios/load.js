/**
 * Load Performance Test
 *
 * This test validates API performance under normal load conditions.
 *
 * Test Configuration:
 * - Ramp up to 100 VUs over 2 minutes
 * - Hold at 100 VUs for 5 minutes
 * - Ramp down to 0 over 1 minute
 * - Total duration: 8 minutes
 *
 * Usage:
 *   k6 run scenarios/load.js
 *
 * Environment Variables:
 *   API_URL - Base URL of the API (default: http://localhost:3000)
 *   API_KEY - API key for authentication (default: test-api-key-performance)
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { loadScenario } from '../k6.config.js';
import {
  config,
  getHeaders,
  getCsvHeaders,
  validateResponse,
  validateCsvResponse,
  trackResponseTime,
  randomSourcedId,
  randomFilter,
  randomPagination,
  sleepWithJitter,
} from '../helpers.js';

// Apply load scenario configuration
export const options = {
  scenarios: {
    load_test: loadScenario,
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'http_reqs': ['rate>50'], // Minimum 50 requests per second
  },
};

/**
 * Main test function
 *
 * Simulates realistic user behavior with mixed operations.
 */
export default function () {
  const headers = getHeaders();
  const csvHeaders = getCsvHeaders();

  // Scenario 1: Browse users (60% of requests)
  if (Math.random() < 0.6) {
    testListEndpoint('users', headers);
    sleepWithJitter(0.3, 0.8);

    if (Math.random() < 0.5) {
      testGetSingleEndpoint('users', 'user-', headers);
    }
  }

  // Scenario 2: Browse classes and enrollments (25% of requests)
  else if (Math.random() < 0.85) {
    testListEndpoint('classes', headers);
    sleepWithJitter(0.3, 0.8);

    // Get class enrollments
    const classId = randomSourcedId('class-');
    testClassEnrollments(classId, headers);

    sleepWithJitter(0.3, 0.8);

    testGetSingleEndpoint('classes', 'class-', headers);
  }

  // Scenario 3: Browse orgs and courses (10% of requests)
  else if (Math.random() < 0.95) {
    testListEndpoint('orgs', headers);
    sleepWithJitter(0.3, 0.8);

    testListEndpoint('courses', headers);
  }

  // Scenario 4: Export CSV (5% of requests)
  else {
    testCsvExport(csvHeaders);
  }

  // Wait before next iteration
  sleep(1);
}

/**
 * Test list endpoint with pagination and filtering
 */
function testListEndpoint(entityType, headers) {
  const { limit, offset } = randomPagination();
  const filter = randomFilter(entityType);

  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}?limit=${limit}&offset=${offset}&filter=${encodeURIComponent(filter)}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType, operation: 'list' } });
  const duration = Date.now() - startTime;

  validateResponse(response, entityType, true);
  trackResponseTime(entityType, duration);
}

/**
 * Test get single endpoint
 */
function testGetSingleEndpoint(entityType, prefix, headers) {
  const sourcedId = randomSourcedId(prefix);
  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}/${sourcedId}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType, operation: 'get' } });
  const duration = Date.now() - startTime;

  if (response.status !== 404) {
    const singularType = entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
    validateResponse(response, singularType, false);
  }

  trackResponseTime(entityType, duration);
}

/**
 * Test get class enrollments
 */
function testClassEnrollments(classId, headers) {
  const url = `${config.baseUrl}/ims/oneroster/v1p2/classes/${classId}/enrollments`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: 'enrollments', operation: 'class_enrollments' } });
  const duration = Date.now() - startTime;

  if (response.status !== 404) {
    validateResponse(response, 'enrollments', true);
  }

  trackResponseTime('enrollments', duration);
}

/**
 * Test CSV export endpoint
 */
function testCsvExport(headers) {
  const entityTypes = ['users', 'orgs', 'classes', 'courses', 'enrollments', 'demographics', 'academicSessions'];
  const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];

  const url = `${config.baseUrl}/ims/oneroster/v1p2/csv/export/${entityType}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: 'csv_export', operation: 'export' } });
  const duration = Date.now() - startTime;

  validateCsvResponse(response);
  trackResponseTime('csv_export', duration);
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting Load Performance Test');
  console.log(`API URL: ${config.baseUrl}`);
  console.log(`Max Virtual Users: 100`);
  console.log(`Test Duration: 8 minutes`);
  console.log(`Ramp-up: 2 minutes`);
  console.log(`Steady State: 5 minutes`);
  console.log(`Ramp-down: 1 minute`);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Load Performance Test Complete');
}
