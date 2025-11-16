/**
 * Spike Performance Test
 *
 * This test validates API resilience to sudden traffic spikes.
 *
 * Test Configuration:
 * - Start with 10 VUs (normal load)
 * - Sudden spike to 200 VUs in 10 seconds
 * - Hold spike for 1 minute
 * - Drop back to 10 VUs in 10 seconds
 * - Recover for 1 minute
 * - Total duration: ~3.5 minutes
 *
 * Usage:
 *   k6 run scenarios/spike.js
 *
 * Purpose:
 * - Test auto-scaling response
 * - Validate rate limiting behavior
 * - Check error recovery mechanisms
 *
 * Environment Variables:
 *   API_URL - Base URL of the API (default: http://localhost:3000)
 *   API_KEY - API key for authentication (default: test-api-key-performance)
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { spikeScenario } from '../k6.config.js';
import {
  config,
  getHeaders,
  validateResponse,
  trackResponseTime,
  randomSourcedId,
  randomFilter,
  randomPagination,
  sleepWithJitter,
} from '../helpers.js';

// Apply spike scenario configuration
export const options = {
  scenarios: {
    spike_test: spikeScenario,
  },
  thresholds: {
    // More lenient thresholds for spike test
    'http_req_duration': ['p(95)<1500', 'p(99)<3000'],
    'http_req_failed': ['rate<0.1'], // Allow up to 10% errors during spike
  },
};

/**
 * Main test function
 */
export default function () {
  const headers = getHeaders();

  // Simulate varied user behavior during spike
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - List users
    testListEndpoint('users', headers);
  } else if (scenario < 0.7) {
    // 30% - List classes and get enrollments
    testListEndpoint('classes', headers);
    sleepWithJitter(0.2, 0.5);

    const classId = randomSourcedId('class-');
    testClassEnrollments(classId, headers);
  } else if (scenario < 0.9) {
    // 20% - Get single entities
    testGetSingleEndpoint('users', 'user-', headers);
    sleepWithJitter(0.2, 0.5);
    testGetSingleEndpoint('classes', 'class-', headers);
  } else {
    // 10% - List multiple entity types
    testListEndpoint('orgs', headers);
    sleepWithJitter(0.2, 0.5);
    testListEndpoint('courses', headers);
  }

  // Short sleep
  sleepWithJitter(0.1, 0.3);
}

function testListEndpoint(entityType, headers) {
  const { limit, offset } = randomPagination();
  const filter = randomFilter(entityType);

  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}?limit=${limit}&offset=${offset}&filter=${encodeURIComponent(filter)}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType, test: 'spike' } });
  const duration = Date.now() - startTime;

  validateResponse(response, entityType, true);
  trackResponseTime(entityType, duration);
}

function testGetSingleEndpoint(entityType, prefix, headers) {
  const sourcedId = randomSourcedId(prefix);
  const url = `${config.baseUrl}/ims/oneroster/v1p2/${entityType}/${sourcedId}`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: entityType, test: 'spike' } });
  const duration = Date.now() - startTime;

  if (response.status !== 404) {
    const singularType = entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
    validateResponse(response, singularType, false);
  }

  trackResponseTime(entityType, duration);
}

function testClassEnrollments(classId, headers) {
  const url = `${config.baseUrl}/ims/oneroster/v1p2/classes/${classId}/enrollments`;

  const startTime = Date.now();
  const response = http.get(url, { headers, tags: { endpoint: 'enrollments', test: 'spike' } });
  const duration = Date.now() - startTime;

  if (response.status !== 404) {
    validateResponse(response, 'enrollments', true);
  }

  trackResponseTime('enrollments', duration);
}

export function setup() {
  console.log('Starting Spike Performance Test');
  console.log(`API URL: ${config.baseUrl}`);
  console.log(`Normal Load: 10 VUs`);
  console.log(`Spike Load: 200 VUs`);
  console.log(`Spike Duration: 1 minute`);
  console.log('Testing system resilience to sudden traffic increases');
}

export function teardown(data) {
  console.log('Spike Performance Test Complete');
}
