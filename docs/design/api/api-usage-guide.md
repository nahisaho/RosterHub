# RosterHub OneRoster API - Developer Usage Guide

**Project**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Version**: 1.0
**Date**: 2025-11-14
**Audience**: Learning Tool Vendors, Integration Engineers
**Status**: Draft

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Authentication Setup](#2-authentication-setup)
3. [Basic API Usage](#3-basic-api-usage)
4. [Delta/Incremental Sync](#4-deltaincremental-sync)
5. [CSV Import/Export](#5-csv-importexport)
6. [Code Examples](#6-code-examples)
7. [Best Practices](#7-best-practices)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Getting Started

### 1.1 Prerequisites

Before integrating with RosterHub API, ensure you have:

- ✅ **API Key**: Contact your Board of Education administrator
- ✅ **IP Whitelist Registration**: Provide your server IP addresses
- ✅ **HTTPS Support**: TLS 1.3 compatible HTTP client
- ✅ **JSON Parser**: Ability to parse JSON responses
- ✅ **Base URL**: `https://api.rosterhub.example.com/ims/oneroster/v1p2`

### 1.2 Quick Start

**1. Test API Connection**:
```bash
curl -H "X-API-Key: your-api-key-here" \
     https://api.rosterhub.example.com/ims/oneroster/v1p2/users?limit=1
```

**2. Expected Response**:
```json
{
  "users": [
    {
      "sourcedId": "user_abc123",
      "givenName": "太郎",
      "familyName": "山田",
      ...
    }
  ]
}
```

**3. Check Rate Limits**:
```bash
curl -I -H "X-API-Key: your-api-key-here" \
     https://api.rosterhub.example.com/ims/oneroster/v1p2/users
```

Response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1636891200
```

---

## 2. Authentication Setup

### 2.1 API Key Management

**Obtaining API Key**:
1. Contact your Board of Education system administrator
2. Provide your organization name and purpose
3. Receive API key: `ak_{32-character-string}`
4. Store securely (environment variable, secret manager)

**Security Best Practices**:
- ❌ **Never** commit API keys to version control
- ✅ Store in environment variables or secret managers
- ✅ Rotate keys every 90 days
- ✅ Use separate keys for dev/staging/production

### 2.2 IP Whitelist Configuration

**Setup Process**:
1. Identify your server's public IP address(es)
2. Provide IP addresses to administrator (IPv4 or IPv6)
3. Wait for whitelist approval
4. Test connection from whitelisted IP

**Dynamic IPs**:
- Use CIDR notation for IP ranges (e.g., `203.0.113.0/24`)
- Update whitelist when IPs change
- Consider using static IPs for production

### 2.3 Authentication Example

**cURL**:
```bash
curl -H "X-API-Key: ak_1234567890abcdef1234567890abcdef" \
     https://api.rosterhub.example.com/ims/oneroster/v1p2/users
```

**JavaScript (Node.js)**:
```javascript
const axios = require('axios');

const API_KEY = process.env.ROSTERHUB_API_KEY;
const BASE_URL = 'https://api.rosterhub.example.com/ims/oneroster/v1p2';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Accept': 'application/json'
  }
});

// Example: Fetch users
async function getUsers() {
  const response = await client.get('/users');
  return response.data.users;
}
```

**Python**:
```python
import os
import requests

API_KEY = os.getenv('ROSTERHUB_API_KEY')
BASE_URL = 'https://api.rosterhub.example.com/ims/oneroster/v1p2'

headers = {
    'X-API-Key': API_KEY,
    'Accept': 'application/json'
}

# Example: Fetch users
response = requests.get(f'{BASE_URL}/users', headers=headers)
users = response.json()['users']
```

---

## 3. Basic API Usage

### 3.1 Fetching All Users

**Request**:
```bash
GET /ims/oneroster/v1p2/users?limit=100&offset=0
X-API-Key: ak_1234567890abcdef1234567890abcdef
```

**Response**:
```json
{
  "users": [
    {
      "sourcedId": "user_stu001",
      "status": "active",
      "dateLastModified": "2025-11-14T10:30:00Z",
      "dateCreated": "2025-11-01T09:00:00Z",
      "enabledUser": true,
      "username": "taro.yamada",
      "userIds": ["STU20250001"],
      "givenName": "太郎",
      "familyName": "山田",
      "role": "student",
      "identifier": "STU20250001",
      "email": "taro.yamada@example.school.jp",
      "metadata": {
        "jp": {
          "kanaGivenName": "たろう",
          "kanaFamilyName": "やまだ",
          "homeClass": "class_hr_7a",
          "gender": "male",
          "attendanceNumber": 15
        }
      },
      "orgs": [
        {
          "href": "https://api.rosterhub.example.com/ims/oneroster/v1p2/orgs/org_school001",
          "sourcedId": "org_school001",
          "type": "org"
        }
      ],
      "grades": ["7"]
    }
  ]
}
```

**Response Headers**:
```
HTTP/1.1 200 OK
X-Total-Count: 1523
Link: <https://api.rosterhub.example.com/ims/oneroster/v1p2/users?offset=100&limit=100>; rel="next"
```

### 3.2 Fetching Single User

**Request**:
```bash
GET /ims/oneroster/v1p2/users/user_stu001
X-API-Key: ak_1234567890abcdef1234567890abcdef
```

**Response**:
```json
{
  "user": {
    "sourcedId": "user_stu001",
    "givenName": "太郎",
    "familyName": "山田",
    ...
  }
}
```

### 3.3 Filtering Records

**Active Students Only**:
```bash
GET /users?filter=role='student' AND status='active'
```

**Exclude Deleted Records**:
```bash
GET /users?filter=status!='tobedeleted'
```

**Specific School**:
```bash
GET /users?filter=orgs.sourcedId='org_school001'
```

### 3.4 Pagination

**JavaScript Example**:
```javascript
async function fetchAllUsers() {
  let allUsers = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await client.get('/users', {
      params: { limit, offset }
    });

    const users = response.data.users;
    allUsers = allUsers.concat(users);

    const totalCount = parseInt(response.headers['x-total-count'], 10);
    offset += limit;
    hasMore = offset < totalCount;
  }

  return allUsers;
}
```

**Python Example**:
```python
def fetch_all_users():
    all_users = []
    offset = 0
    limit = 100

    while True:
        response = requests.get(
            f'{BASE_URL}/users',
            headers=headers,
            params={'limit': limit, 'offset': offset}
        )
        users = response.json()['users']
        all_users.extend(users)

        total_count = int(response.headers.get('X-Total-Count', 0))
        offset += limit
        if offset >= total_count:
            break

    return all_users
```

---

## 4. Delta/Incremental Sync

### 4.1 Initial Full Sync

**Step 1: Fetch all users**:
```javascript
async function initialSync() {
  const users = await fetchAllUsers(); // See pagination example

  // Store in local database
  await db.users.insertMany(users);

  // Record sync timestamp
  const lastSyncTime = new Date().toISOString();
  await db.syncState.upsert({ entity: 'users', lastSyncTime });

  return users.length;
}
```

### 4.2 Incremental Sync (Delta API)

**Step 2: Fetch only changed records**:
```javascript
async function incrementalSync() {
  // Get last sync timestamp
  const syncState = await db.syncState.findOne({ entity: 'users' });
  const lastSyncTime = syncState.lastSyncTime;

  // Fetch changed records
  const response = await client.get('/users', {
    params: {
      filter: `dateLastModified>=${lastSyncTime}`,
      limit: 1000
    }
  });

  const changedUsers = response.data.users;

  // Process each record
  for (const user of changedUsers) {
    if (user.dateCreated === user.dateLastModified) {
      // New record
      await db.users.insert(user);
    } else if (user.status === 'tobedeleted') {
      // Deleted record (soft delete)
      await db.users.delete({ sourcedId: user.sourcedId });
    } else {
      // Updated record
      await db.users.update({ sourcedId: user.sourcedId }, user);
    }
  }

  // Update sync timestamp
  await db.syncState.update(
    { entity: 'users' },
    { lastSyncTime: new Date().toISOString() }
  );

  return changedUsers.length;
}
```

**Python Example**:
```python
from datetime import datetime

def incremental_sync():
    # Get last sync timestamp
    sync_state = db.sync_state.find_one({'entity': 'users'})
    last_sync_time = sync_state['lastSyncTime']

    # Fetch changed records
    response = requests.get(
        f'{BASE_URL}/users',
        headers=headers,
        params={
            'filter': f'dateLastModified>={last_sync_time}',
            'limit': 1000
        }
    )
    changed_users = response.json()['users']

    # Process each record
    for user in changed_users:
        if user['dateCreated'] == user['dateLastModified']:
            # New record
            db.users.insert_one(user)
        elif user['status'] == 'tobedeleted':
            # Deleted record
            db.users.delete_one({'sourcedId': user['sourcedId']})
        else:
            # Updated record
            db.users.update_one(
                {'sourcedId': user['sourcedId']},
                {'$set': user}
            )

    # Update sync timestamp
    db.sync_state.update_one(
        {'entity': 'users'},
        {'$set': {'lastSyncTime': datetime.utcnow().isoformat()}}
    )

    return len(changed_users)
```

### 4.3 Sync Scheduler

**Node.js (node-cron)**:
```javascript
const cron = require('node-cron');

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Starting incremental sync...');
  const changedRecords = await incrementalSync();
  console.log(`Synced ${changedRecords} changed records`);
});
```

**Python (APScheduler)**:
```python
from apscheduler.schedulers.blocking import BlockingScheduler

scheduler = BlockingScheduler()

# Run every hour
@scheduler.scheduled_job('interval', hours=1)
def scheduled_sync():
    print('Starting incremental sync...')
    changed_records = incremental_sync()
    print(f'Synced {changed_records} changed records')

scheduler.start()
```

---

## 5. CSV Import/Export

### 5.1 CSV Import

**Step 1: Prepare CSV files**:
```
manifest.csv
users.csv
orgs.csv
classes.csv
```

**Step 2: Upload files**:
```javascript
const FormData = require('form-data');
const fs = require('fs');

async function importCsv() {
  const form = new FormData();
  form.append('manifest', fs.createReadStream('./manifest.csv'));
  form.append('users', fs.createReadStream('./users.csv'));
  form.append('orgs', fs.createReadStream('./orgs.csv'));

  const response = await client.post('/csv/import', form, {
    headers: form.getHeaders()
  });

  const jobId = response.data.jobId;
  console.log(`Import job created: ${jobId}`);

  return jobId;
}
```

**Step 3: Poll job status**:
```javascript
async function waitForImportComplete(jobId) {
  while (true) {
    const response = await client.get(`/csv/jobs/${jobId}`);
    const job = response.data;

    console.log(`Progress: ${job.progress.percentComplete}%`);

    if (['completed', 'failed', 'partial_success'].includes(job.status)) {
      console.log(`Job ${job.status}`);
      if (job.errors && job.errors.length > 0) {
        console.log('Errors:', job.errors);
      }
      return job;
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Usage
const jobId = await importCsv();
const result = await waitForImportComplete(jobId);
```

### 5.2 CSV Export

**Download all entities**:
```javascript
async function exportCsv() {
  const response = await client.get('/csv/export', {
    responseType: 'stream'
  });

  const writer = fs.createWriteStream('./oneroster-export.zip');
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}
```

**Export specific entities**:
```bash
curl -H "X-API-Key: ak_1234567890abcdef1234567890abcdef" \
     "https://api.rosterhub.example.com/csv/export?entities=users,orgs" \
     -o export.zip
```

**Export only active records**:
```bash
curl -H "X-API-Key: ak_1234567890abcdef1234567890abcdef" \
     "https://api.rosterhub.example.com/csv/export?filter=status='active'" \
     -o export-active.zip
```

---

## 6. Code Examples

### 6.1 Complete Integration Example (JavaScript)

```javascript
const axios = require('axios');

class OneRosterClient {
  constructor(apiKey, baseUrl) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });
  }

  // Fetch all users with pagination
  async getAllUsers() {
    let allUsers = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.client.get('/users', {
        params: { limit, offset }
      });

      const users = response.data.users;
      allUsers = allUsers.concat(users);

      const totalCount = parseInt(response.headers['x-total-count'], 10);
      offset += limit;
      if (offset >= totalCount) break;
    }

    return allUsers;
  }

  // Delta sync
  async getChangedUsers(since) {
    const response = await this.client.get('/users', {
      params: {
        filter: `dateLastModified>=${since}`,
        limit: 1000
      }
    });
    return response.data.users;
  }

  // Get single user
  async getUser(sourcedId) {
    const response = await this.client.get(`/users/${sourcedId}`);
    return response.data.user;
  }

  // Filter users
  async filterUsers(filter, limit = 100) {
    const response = await this.client.get('/users', {
      params: { filter, limit }
    });
    return response.data.users;
  }
}

// Usage
const client = new OneRosterClient(
  process.env.ROSTERHUB_API_KEY,
  'https://api.rosterhub.example.com/ims/oneroster/v1p2'
);

// Fetch all students
const students = await client.filterUsers("role='student' AND status='active'");
console.log(`Found ${students.length} students`);

// Delta sync
const changedUsers = await client.getChangedUsers('2025-11-14T00:00:00Z');
console.log(`${changedUsers.length} users changed since 2025-11-14`);
```

### 6.2 Complete Integration Example (Python)

```python
import os
import requests
from datetime import datetime
from typing import List, Dict

class OneRosterClient:
    def __init__(self, api_key: str, base_url: str):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Accept': 'application/json'
        }

    def get_all_users(self) -> List[Dict]:
        """Fetch all users with pagination"""
        all_users = []
        offset = 0
        limit = 100

        while True:
            response = requests.get(
                f'{self.base_url}/users',
                headers=self.headers,
                params={'limit': limit, 'offset': offset}
            )
            response.raise_for_status()

            users = response.json()['users']
            all_users.extend(users)

            total_count = int(response.headers.get('X-Total-Count', 0))
            offset += limit
            if offset >= total_count:
                break

        return all_users

    def get_changed_users(self, since: str) -> List[Dict]:
        """Delta sync - fetch changed users since timestamp"""
        response = requests.get(
            f'{self.base_url}/users',
            headers=self.headers,
            params={
                'filter': f'dateLastModified>={since}',
                'limit': 1000
            }
        )
        response.raise_for_status()
        return response.json()['users']

    def get_user(self, sourced_id: str) -> Dict:
        """Get single user by sourcedId"""
        response = requests.get(
            f'{self.base_url}/users/{sourced_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['user']

    def filter_users(self, filter_expr: str, limit: int = 100) -> List[Dict]:
        """Filter users with custom filter"""
        response = requests.get(
            f'{self.base_url}/users',
            headers=self.headers,
            params={'filter': filter_expr, 'limit': limit}
        )
        response.raise_for_status()
        return response.json()['users']

# Usage
client = OneRosterClient(
    api_key=os.getenv('ROSTERHUB_API_KEY'),
    base_url='https://api.rosterhub.example.com/ims/oneroster/v1p2'
)

# Fetch all students
students = client.filter_users("role='student' AND status='active'")
print(f'Found {len(students)} students')

# Delta sync
changed_users = client.get_changed_users('2025-11-14T00:00:00Z')
print(f'{len(changed_users)} users changed since 2025-11-14')
```

---

## 7. Best Practices

### 7.1 Performance Optimization

**1. Use Delta API for Regular Syncs**:
```javascript
// ✅ Good: Incremental sync
await client.get('/users?filter=dateLastModified>=2025-11-14T00:00:00Z');

// ❌ Bad: Full sync every time
await fetchAllUsers(); // Fetches all 200,000 users
```

**2. Optimize Pagination**:
```javascript
// ✅ Good: Large page size for bulk operations
const limit = 1000; // Max allowed

// ❌ Bad: Small page size (many requests)
const limit = 10;
```

**3. Use Field Selection**:
```javascript
// ✅ Good: Fetch only needed fields
await client.get('/users?fields=sourcedId,givenName,familyName,email');

// ❌ Bad: Fetch all fields when not needed
await client.get('/users');
```

### 7.2 Error Handling

**Retry Strategy**:
```javascript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limit: wait for Retry-After
        const retryAfter = parseInt(error.response.headers['retry-after'], 10);
        console.log(`Rate limited. Waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else if (error.response?.status >= 500) {
        // Server error: exponential backoff
        const delay = Math.pow(2, i) * 1000;
        console.log(`Server error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Client error: don't retry
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const users = await retryRequest(() => client.get('/users'));
```

### 7.3 Rate Limit Management

**Track Rate Limits**:
```javascript
class RateLimitAwareClient {
  constructor(apiKey, baseUrl) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: { 'X-API-Key': apiKey }
    });

    this.client.interceptors.response.use(response => {
      this.rateLimit = {
        limit: parseInt(response.headers['x-ratelimit-limit'], 10),
        remaining: parseInt(response.headers['x-ratelimit-remaining'], 10),
        reset: parseInt(response.headers['x-ratelimit-reset'], 10)
      };
      return response;
    });
  }

  getRateLimitStatus() {
    return this.rateLimit;
  }
}
```

---

## 8. Troubleshooting

### 8.1 Common Errors

**401 Unauthorized**:
```json
{
  "imsx_codeMajor": "failure",
  "imsx_description": "Invalid API key or IP address not whitelisted"
}
```

**Solution**:
- Verify API key is correct
- Check IP address is whitelisted
- Ensure using HTTPS

**429 Too Many Requests**:
```json
{
  "imsx_codeMajor": "failure",
  "imsx_description": "Rate limit exceeded. Please retry after 3600 seconds."
}
```

**Solution**:
- Wait for `Retry-After` duration
- Reduce request frequency
- Implement exponential backoff

**404 Not Found**:
```json
{
  "imsx_codeMajor": "failure",
  "imsx_description": "User with sourcedId 'user_abc123' not found"
}
```

**Solution**:
- Verify `sourcedId` exists
- Check for typos
- Ensure user not deleted (`status='tobedeleted'`)

### 8.2 Debugging Tips

**Enable Request Logging**:
```javascript
// Axios request interceptor
client.interceptors.request.use(request => {
  console.log('Request:', request.method.toUpperCase(), request.url);
  return request;
});

// Axios response interceptor
client.interceptors.response.use(
  response => {
    console.log('Response:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('Error:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);
```

**Test with Postman/Insomnia**:
1. Import OpenAPI spec: `openapi-rosterhub-v1.2.2.yaml`
2. Set environment variable: `X-API-Key`
3. Test endpoints interactively

---

## Appendix A: Quick Reference

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users` | GET | List all users |
| `/users/{sourcedId}` | GET | Get user by ID |
| `/orgs` | GET | List all organizations |
| `/classes` | GET | List all classes |
| `/courses` | GET | List all courses |
| `/enrollments` | GET | List all enrollments |
| `/academicSessions` | GET | List all sessions |
| `/demographics` | GET | List all demographics |
| `/csv/import` | POST | Upload CSV files |
| `/csv/export` | GET | Download CSV files |
| `/csv/jobs/{jobId}` | GET | Get import job status |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Records per page (max: 1000) |
| `offset` | integer | Starting record index |
| `filter` | string | OneRoster filter expression |
| `sort` | string | Sort field (`-` for descending) |
| `fields` | string | Comma-separated field list |

---

**Document Status**: Draft
**Contact**: api-support@rosterhub.example.com
**Last Updated**: 2025-11-14

