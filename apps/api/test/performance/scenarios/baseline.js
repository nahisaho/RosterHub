/**
 * Baseline Performance Test
 *
 * This test establishes baseline performance metrics for all OneRoster API endpoints.
 *
 * Test Configuration:
 * - 10 Virtual Users (VUs)
 * - 1 minute duration
 * - Tests all 7 entity types + CSV export
 *
 * Usage:
 *   k6 run scenarios/baseline.js
 *
 * Environment Variables:
 *   API_URL - Base URL of the API (default: http://localhost:3000)
 *   API_KEY - API key for authentication (default: test-api-key-performance)
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { baselineScenario } from '../k6.config.js';
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

// Apply baseline scenario configuration
export const options = {
  scenarios: {
    baseline: baselineScenario,
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
  },
};

/**
 * Main test function
 *
 * Simulates realistic user behavior across all OneRoster endpoints.
 */
export default function () {
  const headers = getHeaders();
  const csvHeaders = getCsvHeaders();

  // Test 1: List Users (with pagination and filtering)
  testListEndpoint('users', headers);

  // Test 2: Get Single User
  testGetSingleEndpoint('users', 'user-', headers);

  sleepWithJitter(0.5, 1.5);

  // Test 3: List Orgs
  testListEndpoint('orgs', headers);

  // Test 4: Get Single Org
  testGetSingleEndpoint('orgs', 'org-', headers);

  sleepWithJitter(0.5, 1.5);

  // Test 5: List Classes
  testListEndpoint('classes', headers);

  // Test 6: Get Single Class
  testGetSingleEndpoint('classes', 'class-', headers);

  sleepWithJitter(0.5, 1.5);

  // Test 7: List Courses
  testListEndpoint('courses', headers);

  // Test 8: Get Single Course
  testGetSingleEndpoint('courses', 'course-', headers);

  sleepWithJitter(0.5, 1.5);

  // Test 9: List Enrollments
  testListEndpoint('enrollments', headers);

  // Test 10: Get Single Enrollment
  testGetSingleEndpoint('enrollments', 'enrollment-', headers);

  sleepWithJitter(0.5, 1.5);

  // Test 11: List Demographics
  testListEndpoint('demographics', headers);

  // Test 12: Get Single Demographic
  testGetSingleEndpoint('demographics', 'demographic-', headers);

  sleepWithJitter(0.5, 1.5);

  // Test 13: List Academic Sessions
  testListEndpoint('academicSessions', headers);

  // Test 14: Get Single Academic Session
  testGetSingleEndpoint('academicSessions', 'session-', headers);

  sleepWithJitter(0.5, 1.5);

  // Test 15: CSV Export (randomly select entity type)
  testCsvExport(csvHeaders);

  // Wait before next iteration
  sleep(1);
}

/**
 * Test list endpoint with pagination and filtering
 *
 * @param {string} entityType - Entity type (users, orgs, classes, etc.)
 * @param {object} headers - HTTP headers
 */
function testListEndpoint(entityType, headers) {
  const { limit, offset } = randomPagination();
  const filter = randomFilter(entityType);

  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}?limit=${limit}&offset=${offset}&filter=${encodeURIComponent(filter)}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType } });
  const duration = Date.now() - startTime;

  validateResponse(response, entityType, true);
  trackResponseTime(entityType, duration);
}

/**
 * Test get single endpoint
 *
 * @param {string} entityType - Entity type (users, orgs, classes, etc.)
 * @param {string} prefix - Prefix for sourcedId
 * @param {object} headers - HTTP headers
 */
function testGetSingleEndpoint(entityType, prefix, headers) {
  const sourcedId = randomSourcedId(prefix);
  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}/${sourcedId}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType } });
  const duration = Date.now() - startTime;

  // Accept 404 as valid response (entity may not exist in test data)
  if (response.status !== 404) {
    const singularType = entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
    validateResponse(response, singularType, false);
  }

  trackResponseTime(entityType, duration);
}

/**
 * Test CSV export endpoint
 *
 * @param {object} headers - HTTP headers for CSV
 */
function testCsvExport(headers) {
  const entityTypes = ['users', 'orgs', 'classes', 'courses', 'enrollments', 'demographics', 'academicSessions'];
  const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];

  const url = `${config.baseUrl}/ims/oneroster/v1p2/csv/export/${entityType}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: 'csv_export' } });
  const duration = Date.now() - startTime;

  validateCsvResponse(response);
  trackResponseTime('csv_export', duration);
}

/**
 * Setup function (runs once before test)
 */
export function setup() {
  console.log('Starting Baseline Performance Test');
  console.log(`API URL: ${config.baseUrl}`);
  console.log(`Test Duration: 1 minute`);
  console.log(`Virtual Users: 10`);
}

/**
 * Teardown function (runs once after test)
 */
export function teardown(data) {
  console.log('Baseline Performance Test Complete');
}
