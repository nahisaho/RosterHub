/**
 * k6 Performance Testing Helpers
 *
 * Common functions and utilities for OneRoster API performance tests.
 */

import { check } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

/**
 * Custom Metrics
 */
export const metrics = {
  // Response time trends per endpoint
  usersResponseTime: new Trend('users_response_time'),
  orgsResponseTime: new Trend('orgs_response_time'),
  classesResponseTime: new Trend('classes_response_time'),
  coursesResponseTime: new Trend('courses_response_time'),
  enrollmentsResponseTime: new Trend('enrollments_response_time'),
  demographicsResponseTime: new Trend('demographics_response_time'),
  academicSessionsResponseTime: new Trend('academic_sessions_response_time'),
  csvExportResponseTime: new Trend('csv_export_response_time'),

  // Success/failure counters
  successfulRequests: new Counter('successful_requests'),
  failedRequests: new Counter('failed_requests'),

  // Error rate
  errorRate: new Rate('error_rate'),
};

/**
 * API Configuration
 */
export const config = {
  baseUrl: __ENV.API_URL || 'http://localhost:3000',
  apiKey: __ENV.API_KEY || 'test-api-key-performance',
};

/**
 * Common HTTP headers for OneRoster API
 */
export function getHeaders() {
  return {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Common HTTP headers for CSV operations
 */
export function getCsvHeaders() {
  return {
    'X-API-Key': config.apiKey,
    'Accept': 'text/csv',
  };
}

/**
 * Validate OneRoster API response
 *
 * @param {object} response - HTTP response object
 * @param {string} entityType - OneRoster entity type (user, org, class, etc.)
 * @param {boolean} isList - Whether response is a list or single entity
 * @returns {boolean} - Whether response is valid
 */
export function validateResponse(response, entityType, isList = false) {
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
  };

  if (isList) {
    checks[`has ${entityType} array`] = (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body[entityType]);
      } catch (e) {
        return false;
      }
    };
  } else {
    checks[`has ${entityType} object`] = (r) => {
      try {
        const body = JSON.parse(r.body);
        return body[entityType] && typeof body[entityType] === 'object';
      } catch (e) {
        return false;
      }
    };
  }

  const result = check(response, checks);

  // Track metrics
  if (result) {
    metrics.successfulRequests.add(1);
  } else {
    metrics.failedRequests.add(1);
    metrics.errorRate.add(1);
  }

  return result;
}

/**
 * Validate CSV export response
 *
 * @param {object} response - HTTP response object
 * @returns {boolean} - Whether response is valid
 */
export function validateCsvResponse(response) {
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'content-type is CSV': (r) => r.headers['Content-Type']?.includes('csv'),
    'response has body': (r) => r.body && r.body.length > 0,
    'CSV has header row': (r) => r.body.includes('sourcedId'),
  });

  if (result) {
    metrics.successfulRequests.add(1);
  } else {
    metrics.failedRequests.add(1);
    metrics.errorRate.add(1);
  }

  return result;
}

/**
 * Track response time for specific endpoint
 *
 * @param {string} endpoint - Endpoint name (users, orgs, etc.)
 * @param {number} duration - Response duration in milliseconds
 */
export function trackResponseTime(endpoint, duration) {
  switch (endpoint) {
    case 'users':
      metrics.usersResponseTime.add(duration);
      break;
    case 'orgs':
      metrics.orgsResponseTime.add(duration);
      break;
    case 'classes':
      metrics.classesResponseTime.add(duration);
      break;
    case 'courses':
      metrics.coursesResponseTime.add(duration);
      break;
    case 'enrollments':
      metrics.enrollmentsResponseTime.add(duration);
      break;
    case 'demographics':
      metrics.demographicsResponseTime.add(duration);
      break;
    case 'academicSessions':
      metrics.academicSessionsResponseTime.add(duration);
      break;
    case 'csv_export':
      metrics.csvExportResponseTime.add(duration);
      break;
  }
}

/**
 * Generate random sourcedId from a pool
 *
 * @param {string} prefix - Prefix for sourcedId (user-, org-, class-, etc.)
 * @param {number} poolSize - Size of the ID pool (default: 1000)
 * @returns {string} - Random sourcedId
 */
export function randomSourcedId(prefix, poolSize = 1000) {
  const id = Math.floor(Math.random() * poolSize) + 1;
  return `${prefix}${String(id).padStart(6, '0')}`;
}

/**
 * Generate random filter query
 *
 * @param {string} entityType - Entity type (user, org, class, etc.)
 * @returns {string} - Random filter query parameter
 */
export function randomFilter(entityType) {
  const filters = {
    users: [
      "role='student'",
      "role='teacher'",
      "status='active'",
      "enabledUser=true",
    ],
    orgs: [
      "type='school'",
      "type='district'",
      "status='active'",
    ],
    classes: [
      "status='active'",
      "classType='scheduled'",
    ],
    courses: [
      "status='active'",
    ],
    enrollments: [
      "role='student'",
      "role='teacher'",
      "status='active'",
    ],
    demographics: [
      "sex='male'",
      "sex='female'",
      "status='active'",
    ],
    academicSessions: [
      "type='schoolYear'",
      "type='semester'",
      "status='active'",
    ],
  };

  const entityFilters = filters[entityType] || ["status='active'"];
  return entityFilters[Math.floor(Math.random() * entityFilters.length)];
}

/**
 * Sleep with jitter to simulate realistic user behavior
 *
 * @param {number} min - Minimum sleep time in seconds
 * @param {number} max - Maximum sleep time in seconds
 */
export function sleepWithJitter(min, max) {
  const { sleep } = require('k6');
  const sleepTime = min + Math.random() * (max - min);
  sleep(sleepTime);
}

/**
 * Generate pagination parameters
 *
 * @returns {object} - Pagination parameters (limit, offset)
 */
export function randomPagination() {
  const limits = [10, 25, 50, 100];
  const limit = limits[Math.floor(Math.random() * limits.length)];
  const offset = Math.floor(Math.random() * 5) * limit; // 0-4 pages

  return { limit, offset };
}
