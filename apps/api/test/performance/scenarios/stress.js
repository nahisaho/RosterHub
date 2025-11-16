/**
 * Stress Performance Test
 *
 * This test identifies the breaking point of the API by gradually increasing load.
 *
 * Test Configuration:
 * - Ramp up to 300 VUs over 7 minutes
 * - Hold at 300 VUs for 3 minutes
 * - Ramp down to 0 over 2 minutes
 * - Total duration: 12 minutes
 *
 * Usage:
 *   k6 run scenarios/stress.js
 *
 * Purpose:
 * - Find maximum capacity
 * - Identify performance degradation points
 * - Test error handling under extreme load
 *
 * Environment Variables:
 *   API_URL - Base URL of the API (default: http://localhost:3000)
 *   API_KEY - API key for authentication (default: test-api-key-performance)
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { stressScenario } from '../k6.config.js';
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

// Apply stress scenario configuration
export const options = {
  scenarios: {
    stress_test: stressScenario,
  },
  thresholds: {
    // Relax thresholds for stress test
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.05'], // Allow up to 5% errors
  },
};

/**
 * Main test function
 */
export default function () {
  const headers = getHeaders();

  // High-intensity mixed operations
  const operations = [
    () => testListEndpoint('users', headers),
    () => testListEndpoint('classes', headers),
    () => testListEndpoint('enrollments', headers),
    () => testGetSingleEndpoint('users', 'user-', headers),
    () => testGetSingleEndpoint('classes', 'class-', headers),
    () => testGetSingleEndpoint('courses', 'course-', headers),
  ];

  // Execute random operation
  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();

  // Shorter sleep for stress test
  sleepWithJitter(0.1, 0.5);
}

function testListEndpoint(entityType, headers) {
  const { limit, offset } = randomPagination();
  const filter = randomFilter(entityType);

  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}?limit=${limit}&offset=${offset}&filter=${encodeURIComponent(filter)}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType, test: 'stress' } });
  const duration = Date.now() - startTime;

  validateResponse(response, entityType, true);
  trackResponseTime(entityType, duration);
}

function testGetSingleEndpoint(entityType, prefix, headers) {
  const sourcedId = randomSourcedId(prefix);
  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}/${sourcedId}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType, test: 'stress' } });
  const duration = Date.now() - startTime;

  if (response.status !== 404) {
    const singularType = entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
    validateResponse(response, singularType, false);
  }

  trackResponseTime(entityType, duration);
}

export function setup() {
  console.log('Starting Stress Performance Test');
  console.log(`API URL: ${config.baseUrl}`);
  console.log(`Max Virtual Users: 300`);
  console.log(`Test Duration: 12 minutes`);
  console.log('WARNING: This test will push the system to its limits');
}

export function teardown(data) {
  console.log('Stress Performance Test Complete');
}
