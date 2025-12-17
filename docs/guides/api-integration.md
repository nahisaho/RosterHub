# API Integration Guide

This guide explains how to integrate your application with the RosterHub OneRoster API.

## Overview

RosterHub provides a REST API compliant with **OneRoster Japan Profile 1.2.2**. The API supports:

- **Bulk Operations**: Full data access for initial sync
- **Delta/Incremental Sync**: Efficient updates using timestamp filtering
- **CRUD Operations**: Create, Read, Update, Delete for all entities
- **CSV Import/Export**: Bulk data operations via CSV files

## Authentication

### API Key Authentication

All API requests require authentication using an API key in the `X-API-Key` header:

```bash
curl -X GET \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  https://your-rosterhub-instance/ims/oneroster/v1p2/users
```

### Obtaining an API Key

Contact your RosterHub administrator to obtain an API key. Keys can be configured with:

- **IP Whitelist**: Restrict access to specific IP addresses
- **Rate Limits**: Custom rate limiting per client
- **Permissions**: Read-only or full access

## Base URL

The API base URL follows the OneRoster specification:

```
https://your-rosterhub-instance/ims/oneroster/v1p2/
```

## Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/users/{sourcedId}` | Get single user |
| POST | `/users` | Create new user |
| PUT | `/users/{sourcedId}` | Update user |
| DELETE | `/users/{sourcedId}` | Delete user (soft delete) |

### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orgs` | List all organizations |
| GET | `/orgs/{sourcedId}` | Get single organization |
| POST | `/orgs` | Create new organization |
| PUT | `/orgs/{sourcedId}` | Update organization |
| DELETE | `/orgs/{sourcedId}` | Delete organization |

### Classes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/classes` | List all classes |
| GET | `/classes/{sourcedId}` | Get single class |
| POST | `/classes` | Create new class |
| PUT | `/classes/{sourcedId}` | Update class |
| DELETE | `/classes/{sourcedId}` | Delete class |

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List all courses |
| GET | `/courses/{sourcedId}` | Get single course |
| POST | `/courses` | Create new course |
| PUT | `/courses/{sourcedId}` | Update course |
| DELETE | `/courses/{sourcedId}` | Delete course |

### Enrollments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/enrollments` | List all enrollments |
| GET | `/enrollments/{sourcedId}` | Get single enrollment |
| POST | `/enrollments` | Create new enrollment |
| PUT | `/enrollments/{sourcedId}` | Update enrollment |
| DELETE | `/enrollments/{sourcedId}` | Delete enrollment |

### Academic Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/academicSessions` | List all academic sessions |
| GET | `/academicSessions/{sourcedId}` | Get single academic session |
| POST | `/academicSessions` | Create new academic session |
| PUT | `/academicSessions/{sourcedId}` | Update academic session |
| DELETE | `/academicSessions/{sourcedId}` | Delete academic session |

### Demographics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/demographics` | List all demographics |
| GET | `/demographics/{sourcedId}` | Get single demographic |
| POST | `/demographics` | Create new demographic |
| PUT | `/demographics/{sourcedId}` | Update demographic |
| DELETE | `/demographics/{sourcedId}` | Delete demographic |

## Query Parameters

### Pagination

Control the number of results returned:

| Parameter | Description | Default | Max |
|-----------|-------------|---------|-----|
| `limit` | Number of records to return | 100 | 10000 |
| `offset` | Number of records to skip | 0 | - |

**Example:**
```bash
GET /ims/oneroster/v1p2/users?limit=50&offset=100
```

### Filtering

Filter results using the `filter` parameter with OneRoster filter syntax:

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `filter=role='student'` |
| `!=` | Not equals | `filter=status!='tobedeleted'` |
| `>` | Greater than | `filter=dateLastModified>'2025-01-01'` |
| `>=` | Greater than or equal | `filter=dateLastModified>='2025-01-01T00:00:00Z'` |
| `<` | Less than | `filter=dateLastModified<'2025-12-31'` |
| `<=` | Less than or equal | `filter=dateLastModified<='2025-12-31T23:59:59Z'` |
| `~` | Contains (like) | `filter=familyName~'田'` |

**Multiple filters (AND):**
```bash
GET /ims/oneroster/v1p2/users?filter=role='student' AND status='active'
```

**Example - Get students:**
```bash
GET /ims/oneroster/v1p2/users?filter=role='student'
```

**Example - Get teachers:**
```bash
GET /ims/oneroster/v1p2/users?filter=role='teacher'
```

### Sorting

Sort results using the `sort` and `orderBy` parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `sort` | Field to sort by | `sort=familyName` |
| `orderBy` | Sort direction | `orderBy=asc` or `orderBy=desc` |

**Example:**
```bash
GET /ims/oneroster/v1p2/users?sort=familyName&orderBy=asc
```

### Field Selection

Select specific fields to return using the `fields` parameter:

```bash
GET /ims/oneroster/v1p2/users?fields=sourcedId,givenName,familyName,email
```

## Delta/Incremental Sync

For efficient synchronization, use timestamp-based filtering to fetch only changed records:

```bash
# Get all records modified since a specific time
GET /ims/oneroster/v1p2/users?filter=dateLastModified>='2025-01-15T00:00:00Z'

# Get deleted records (status = 'tobedeleted')
GET /ims/oneroster/v1p2/users?filter=status='tobedeleted' AND dateLastModified>='2025-01-15T00:00:00Z'
```

### Sync Strategy

1. **Initial Sync**: Fetch all records without filter
2. **Store Timestamp**: Save the current timestamp
3. **Incremental Sync**: Use `dateLastModified>='{lastSyncTime}'` filter
4. **Handle Deletions**: Check for `status='tobedeleted'` records

## Response Format

### Success Response

All responses follow the OneRoster JSON format:

**Single Resource:**
```json
{
  "user": {
    "sourcedId": "user-001",
    "status": "active",
    "dateLastModified": "2025-01-15T10:30:00Z",
    "enabledUser": true,
    "username": "yamada.taro",
    "givenName": "太郎",
    "familyName": "山田",
    "role": "student",
    "email": "yamada.taro@example.ed.jp",
    "metadata": {
      "jp": {
        "kanaGivenName": "タロウ",
        "kanaFamilyName": "ヤマダ"
      }
    }
  }
}
```

**Collection:**
```json
{
  "users": [
    {
      "sourcedId": "user-001",
      "status": "active",
      ...
    },
    {
      "sourcedId": "user-002",
      "status": "active",
      ...
    }
  ]
}
```

### Error Response

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing or invalid API key) |
| 403 | Forbidden (IP not whitelisted) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Japan Profile Extensions

RosterHub supports OneRoster Japan Profile 1.2.2 metadata extensions in the `metadata.jp` namespace:

### Users

```json
{
  "metadata": {
    "jp": {
      "kanaGivenName": "タロウ",
      "kanaFamilyName": "ヤマダ",
      "homeClass": "class-001"
    }
  }
}
```

### Organizations

```json
{
  "metadata": {
    "jp": {
      "kanaName": "トウキョウトリツダイイチショウガッコウ",
      "schoolCode": "A100001",
      "address": "東京都千代田区..."
    }
  }
}
```

## Code Examples

### JavaScript/TypeScript

```typescript
const API_BASE = 'https://your-rosterhub-instance/ims/oneroster/v1p2';
const API_KEY = 'your-api-key';

// Fetch all students
async function getStudents() {
  const response = await fetch(`${API_BASE}/users?filter=role='student'`, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.users;
}

// Create a new user
async function createUser(userData) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// Delta sync - get changes since last sync
async function getDeltaChanges(lastSyncTime) {
  const filter = encodeURIComponent(`dateLastModified>='${lastSyncTime}'`);
  const response = await fetch(`${API_BASE}/users?filter=${filter}`, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}
```

### Python

```python
import requests
from datetime import datetime

API_BASE = 'https://your-rosterhub-instance/ims/oneroster/v1p2'
API_KEY = 'your-api-key'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Fetch all students
def get_students():
    response = requests.get(
        f"{API_BASE}/users",
        headers=headers,
        params={'filter': "role='student'"}
    )
    response.raise_for_status()
    return response.json()['users']

# Create a new user
def create_user(user_data):
    response = requests.post(
        f"{API_BASE}/users",
        headers=headers,
        json=user_data
    )
    response.raise_for_status()
    return response.json()

# Delta sync
def get_delta_changes(last_sync_time):
    response = requests.get(
        f"{API_BASE}/users",
        headers=headers,
        params={'filter': f"dateLastModified>='{last_sync_time}'"}
    )
    response.raise_for_status()
    return response.json()['users']
```

### cURL

```bash
# Get all users
curl -X GET \
  -H "X-API-Key: your-api-key" \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users"

# Get students only
curl -X GET \
  -H "X-API-Key: your-api-key" \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users?filter=role='student'"

# Create a new user
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sourcedId": "user-new-001",
    "enabledUser": true,
    "username": "suzuki.hanako",
    "givenName": "花子",
    "familyName": "鈴木",
    "role": "student",
    "email": "suzuki.hanako@example.ed.jp"
  }' \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users"

# Update a user
curl -X PUT \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suzuki.hanako.new@example.ed.jp"
  }' \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users/user-new-001"

# Delete a user (soft delete)
curl -X DELETE \
  -H "X-API-Key: your-api-key" \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users/user-new-001"
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default Limit**: 100 requests per minute
- **Burst Limit**: 20 requests per second

When rate limited, you'll receive a `429 Too Many Requests` response:

```json
{
  "statusCode": 429,
  "message": "Too Many Requests"
}
```

**Best Practices:**
- Implement exponential backoff on 429 responses
- Use delta sync instead of full sync when possible
- Cache responses when appropriate

## Webhooks (Optional)

RosterHub can notify your application of data changes via webhooks:

### Webhook Payload

```json
{
  "event": "user.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "sourcedId": "user-001",
    "status": "active",
    "dateLastModified": "2025-01-15T10:30:00Z"
  }
}
```

### Event Types

- `user.created`, `user.updated`, `user.deleted`
- `org.created`, `org.updated`, `org.deleted`
- `class.created`, `class.updated`, `class.deleted`
- `enrollment.created`, `enrollment.updated`, `enrollment.deleted`

## Troubleshooting

### 401 Unauthorized

- Verify the API key is correct
- Check the `X-API-Key` header is included

### 403 Forbidden

- Your IP may not be whitelisted
- Contact your administrator

### 429 Too Many Requests

- Implement rate limiting in your client
- Use exponential backoff

### Empty Results

- Check your filter syntax
- Verify the data exists in the system

## Support

- **API Documentation**: Access Swagger UI at `/api`
- **GitHub Issues**: [Report issues](https://github.com/nahisaho/RosterHub/issues)
- **OneRoster Specification**: [IMS Global OneRoster](https://www.imsglobal.org/oneroster)

---

**RosterHub** - OneRoster Japan Profile 1.2.2 Integration Hub
