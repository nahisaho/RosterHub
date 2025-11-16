/**
 * k6 Performance Testing Configuration
 *
 * This configuration file defines test scenarios for OneRoster API performance testing.
 *
 * Test Scenarios:
 * - baseline: Basic performance baseline with minimal load
 * - load: Normal load testing with gradual ramp-up
 * - stress: Stress testing to find breaking points
 * - spike: Spike testing for sudden traffic increases
 *
 * Usage:
 *   k6 run --config k6.config.js scenarios/baseline.js
 */

export const options = {
  // Thresholds define performance criteria
  thresholds: {
    // HTTP request duration
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'], // Error rate < 1%

    // Custom metrics for OneRoster endpoints
    'http_req_duration{endpoint:users}': ['p(95)<400'],
    'http_req_duration{endpoint:orgs}': ['p(95)<300'],
    'http_req_duration{endpoint:classes}': ['p(95)<400'],
    'http_req_duration{endpoint:courses}': ['p(95)<300'],
    'http_req_duration{endpoint:enrollments}': ['p(95)<500'],
    'http_req_duration{endpoint:demographics}': ['p(95)<400'],
    'http_req_duration{endpoint:academicSessions}': ['p(95)<300'],
    'http_req_duration{endpoint:csv_export}': ['p(95)<2000'], // CSV export can be slower
  },

  // Summary export for CI/CD integration
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],

  // Tags for grouping results
  tags: {
    testType: 'performance',
    api: 'oneroster-v1.2',
    profile: 'japan-1.2.2',
  },
};

/**
 * Baseline Test Scenario
 * - 10 VUs (Virtual Users)
 * - 1 minute duration
 * - Purpose: Establish baseline metrics
 */
export const baselineScenario = {
  executor: 'constant-vus',
  vus: 10,
  duration: '1m',
};

/**
 * Load Test Scenario
 * - Ramp up to 100 VUs over 2 minutes
 * - Hold at 100 VUs for 5 minutes
 * - Ramp down to 0 over 1 minute
 * - Purpose: Test normal load conditions
 */
export const loadScenario = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 VUs
    { duration: '5m', target: 100 },  // Hold at 100 VUs
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  gracefulRampDown: '30s',
};

/**
 * Stress Test Scenario
 * - Ramp up to 300 VUs over 5 minutes
 * - Hold at 300 VUs for 3 minutes
 * - Ramp down to 0 over 2 minutes
 * - Purpose: Find breaking points and limits
 */
export const stressScenario = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '2m', target: 100 },  // Warm up
    { duration: '3m', target: 200 },  // Ramp to 200
    { duration: '2m', target: 300 },  // Push to 300
    { duration: '3m', target: 300 },  // Hold at 300
    { duration: '2m', target: 0 },    // Cool down
  ],
  gracefulRampDown: '30s',
};

/**
 * Spike Test Scenario
 * - Sudden spike from 10 to 200 VUs
 * - Hold spike for 1 minute
 * - Drop back to 10 VUs
 * - Purpose: Test system resilience to traffic spikes
 */
export const spikeScenario = {
  executor: 'ramping-vus',
  startVUs: 10,
  stages: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '10s', target: 200 }, // Spike!
    { duration: '1m', target: 200 },  // Hold spike
    { duration: '10s', target: 10 },  // Drop
    { duration: '1m', target: 10 },   // Recover
  ],
};

/**
 * Soak Test Scenario
 * - 50 VUs for extended duration (30 minutes)
 * - Purpose: Test for memory leaks and degradation over time
 */
export const soakScenario = {
  executor: 'constant-vus',
  vus: 50,
  duration: '30m',
};
