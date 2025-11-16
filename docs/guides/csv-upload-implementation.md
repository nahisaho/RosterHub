# CSV Upload Implementation Guide

**RosterHub OneRoster Japan Profile 1.2.2**

This guide provides comprehensive implementation details for CSV file upload functionality in RosterHub, including file format specifications, validation rules, API usage, and best practices.

---

## Table of Contents

1. [Overview](#overview)
2. [CSV File Format](#csv-file-format)
3. [Supported Entity Types](#supported-entity-types)
4. [File Requirements](#file-requirements)
5. [API Reference](#api-reference)
6. [Implementation Examples](#implementation-examples)
7. [Validation Rules](#validation-rules)
8. [Error Handling](#error-handling)
9. [Performance Considerations](#performance-considerations)
10. [Security](#security)
11. [Troubleshooting](#troubleshooting)

---

## Overview

RosterHub provides a robust CSV import system that supports bulk data upload for all OneRoster Japan Profile 1.2.2 entities. The system uses:

- **Streaming parser** for memory-efficient processing of large files (100MB+)
- **Background job processing** with BullMQ for non-blocking operations
- **Real-time validation** with detailed error reporting
- **Batch database inserts** for optimal performance (1000 records per batch)
- **Upsert strategy** for updating existing records or inserting new ones

### Architecture

```
Client → Upload CSV → API Controller → BullMQ Queue → Background Worker
                                                            ↓
                                                     CSV Import Service
                                                            ↓
                                              ┌─────────────┴─────────────┐
                                              ↓                           ↓
                                        CSV Validator              CSV Entity Mapper
                                              ↓                           ↓
                                        Validation OK            Map to Prisma Entity
                                              ↓                           ↓
                                              └─────────────┬─────────────┘
                                                            ↓
                                                      Batch Insert
                                                            ↓
                                                      PostgreSQL
```

---

## CSV File Format

### General Requirements

All CSV files must follow the OneRoster Japan Profile 1.2.2 specification:

1. **Format**: CSV (Comma-Separated Values)
2. **Encoding**: UTF-8 (with or without BOM)
3. **Line Ending**: LF (`\n`) or CRLF (`\r\n`)
4. **Delimiter**: Comma (`,`)
5. **Quote Character**: Double quote (`"`) for fields containing commas or quotes
6. **Header Row**: Required (first row must contain column names)

### Header Row Example

```csv
sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
```

### Data Row Example

```csv
user-001,active,2025-01-15T10:00:00Z,true,太郎,山田,student,yamada.taro,yamada.taro@example.jp,タロウ,ヤマダ
```

### Japan Profile Metadata Fields

Japan Profile extensions use the `metadata.jp.*` prefix in CSV column names:

| Field | Example | Description |
|-------|---------|-------------|
| `metadata.jp.kanaGivenName` | タロウ | Given name in kana (hiragana/katakana) |
| `metadata.jp.kanaFamilyName` | ヤマダ | Family name in kana |
| `metadata.jp.kanaName` | トウキョウトリツコウコウ | Organization name in kana |
| `metadata.jp.orgCode` | TKY-HS-001 | Organization code |
| `metadata.jp.homeClass` | 1-A | Homeroom class |

---

## Supported Entity Types

### 1. Users

**Entity Type**: `users`

**Required Fields**:
- `sourcedId` - Unique identifier (e.g., `user-001`)
- `status` - Status (`active` or `tobedeleted`)
- `dateLastModified` - Last modified timestamp (ISO 8601)
- `enabledUser` - User enabled flag (`true` or `false`)
- `givenName` - Given name (e.g., `太郎`)
- `familyName` - Family name (e.g., `山田`)
- `role` - User role (see [Validation Rules](#validation-rules))
- `username` - Username (unique, e.g., `yamada.taro`)
- `email` - Email address
- `identifier` - Alternative identifier
- `userIds` - User IDs (comma-separated if multiple)

**Japan Profile Fields**:
- `metadata.jp.kanaGivenName` - Kana given name (e.g., `タロウ`)
- `metadata.jp.kanaFamilyName` - Kana family name (e.g., `ヤマダ`)
- `metadata.jp.homeClass` - Homeroom class (e.g., `1-A`)

**Example CSV**:
```csv
sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email,identifier,userIds,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
user-001,active,2025-01-15T10:00:00Z,true,太郎,山田,student,yamada.taro,yamada.taro@example.jp,user-001-id,,タロウ,ヤマダ
user-002,active,2025-01-15T10:00:00Z,true,花子,佐藤,teacher,sato.hanako,sato.hanako@example.jp,user-002-id,,ハナコ,サトウ
```

### 2. Orgs

**Entity Type**: `orgs`

**Required Fields**:
- `sourcedId` - Unique identifier
- `status` - Status (`active` or `tobedeleted`)
- `dateLastModified` - Last modified timestamp
- `name` - Organization name (e.g., `東京都立高校`)
- `type` - Organization type (see [Validation Rules](#validation-rules))
- `identifier` - Alternative identifier

**Japan Profile Fields**:
- `metadata.jp.kanaName` - Organization name in kana (e.g., `トウキョウトリツコウコウ`)
- `metadata.jp.orgCode` - Organization code (e.g., `TKY-HS-001`)

**Example CSV**:
```csv
sourcedId,status,dateLastModified,name,type,identifier,metadata.jp.kanaName,metadata.jp.orgCode
org-001,active,2025-01-15T10:00:00Z,東京都立高校,school,tokyo-hs-001,トウキョウトリツコウコウ,TKY-HS-001
```

### 3. Classes

**Entity Type**: `classes`

**Required Fields**:
- `sourcedId` - Unique identifier
- `status` - Status
- `dateLastModified` - Last modified timestamp
- `title` - Class title
- `classType` - Class type (`homeroom` or `scheduled`)
- `courseSourcedId` - Reference to course
- `schoolSourcedId` - Reference to school

**Example CSV**:
```csv
sourcedId,status,dateLastModified,title,classType,courseSourcedId,schoolSourcedId
class-001,active,2025-01-15T10:00:00Z,数学I,scheduled,course-001,org-001
```

### 4. Courses

**Entity Type**: `courses`

**Required Fields**:
- `sourcedId` - Unique identifier
- `status` - Status
- `dateLastModified` - Last modified timestamp
- `title` - Course title
- `schoolSourcedId` - Reference to school (or use `orgSourcedId`)

**Example CSV**:
```csv
sourcedId,status,dateLastModified,title,schoolSourcedId
course-001,active,2025-01-15T10:00:00Z,数学I,org-001
```

### 5. Enrollments

**Entity Type**: `enrollments`

**Required Fields**:
- `sourcedId` - Unique identifier
- `status` - Status
- `dateLastModified` - Last modified timestamp
- `classSourcedId` - Reference to class
- `schoolSourcedId` - Reference to school
- `userSourcedId` - Reference to user
- `role` - Enrollment role (see [Validation Rules](#validation-rules))

**Example CSV**:
```csv
sourcedId,status,dateLastModified,classSourcedId,schoolSourcedId,userSourcedId,role
enroll-001,active,2025-01-15T10:00:00Z,class-001,org-001,user-001,student
```

### 6. Academic Sessions

**Entity Type**: `academicSessions`

**Required Fields**:
- `sourcedId` - Unique identifier
- `status` - Status
- `dateLastModified` - Last modified timestamp
- `title` - Session title
- `type` - Session type (`gradingPeriod`, `semester`, `schoolYear`, `term`)
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `schoolYear` - School year (e.g., `2025`)

**Example CSV**:
```csv
sourcedId,status,dateLastModified,title,type,startDate,endDate,schoolYear
session-001,active,2025-01-15T10:00:00Z,2025年度 第1学期,semester,2025-04-01,2025-09-30,2025
```

### 7. Demographics

**Entity Type**: `demographics`

**Required Fields**:
- `sourcedId` - Unique identifier
- `status` - Status
- `dateLastModified` - Last modified timestamp

**Optional Fields**:
- `birthDate` - Birth date (ISO 8601)
- `sex` - Sex (OneRoster spec values)

**Example CSV**:
```csv
sourcedId,status,dateLastModified,birthDate,sex
demo-001,active,2025-01-15T10:00:00Z,2010-04-01,male
```

---

## File Requirements

### Size Limits

- **Maximum file size**: 100MB
- **Recommended file size**: < 50MB for faster processing
- **Maximum records**: No hard limit, but 200,000+ records may take 30+ minutes

### Encoding

- **Required encoding**: UTF-8
- **BOM**: Optional (UTF-8 BOM is supported)
- **Alternative encodings**: Not supported (e.g., Shift-JIS, EUC-JP)

### File Naming

- **Extension**: `.csv` (required)
- **Naming convention**: Descriptive names recommended (e.g., `users-2025-01-15.csv`)

---

## API Reference

### Upload CSV File

**Endpoint**: `POST /ims/oneroster/v1p2/csv/import`

**Authentication**: Required (API Key in `X-API-Key` header)

**Request**:
- **Content-Type**: `multipart/form-data`
- **Body Parameters**:
  - `file` (file, required) - CSV file
  - `entityType` (string, required) - Entity type (`users`, `orgs`, `classes`, `courses`, `enrollments`, `academicSessions`, `demographics`)

**Response**: `202 Accepted`
```json
{
  "jobId": "uuid-job-id",
  "status": "pending",
  "entityType": "users",
  "fileName": "users.csv",
  "fileSize": 1024000,
  "totalRecords": 0,
  "processedRecords": 0,
  "successCount": 0,
  "errorCount": 0,
  "errors": [],
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### Get Job Status

**Endpoint**: `GET /ims/oneroster/v1p2/csv/import/:jobId`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "jobId": "uuid-job-id",
  "status": "processing",
  "progress": 65,
  "entityType": "users",
  "fileName": "users.csv",
  "fileSize": 1024000,
  "totalRecords": 10000,
  "processedRecords": 6500,
  "successCount": 6450,
  "errorCount": 50,
  "errors": [
    {
      "line": 123,
      "field": "email",
      "value": "invalid-email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    }
  ],
  "startedAt": "2025-01-15T10:00:00Z",
  "completedAt": null
}
```

### List All Jobs

**Endpoint**: `GET /ims/oneroster/v1p2/csv/import`

**Authentication**: Required

**Query Parameters**:
- `status` (optional) - Filter by status (`pending`, `processing`, `completed`, `failed`, `cancelled`)
- `entityType` (optional) - Filter by entity type
- `offset` (optional) - Pagination offset (default: 0)
- `limit` (optional) - Pagination limit (default: 20, max: 100)

**Response**: `200 OK`
```json
{
  "jobs": [
    {
      "jobId": "uuid-job-id",
      "status": "completed",
      "entityType": "users",
      "fileName": "users.csv",
      "totalRecords": 10000,
      "successCount": 9950,
      "errorCount": 50,
      "createdAt": "2025-01-15T10:00:00Z",
      "completedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "offset": 0,
  "limit": 20
}
```

---

## Implementation Examples

### Example 1: cURL

```bash
# Upload users CSV file
curl -X POST http://localhost:3000/ims/oneroster/v1p2/csv/import \
  -H "X-API-Key: your-api-key" \
  -F "file=@users.csv" \
  -F "entityType=users"

# Get job status
curl -X GET http://localhost:3000/ims/oneroster/v1p2/csv/import/uuid-job-id \
  -H "X-API-Key: your-api-key"
```

### Example 2: JavaScript (Fetch API)

```javascript
// Upload CSV file
async function uploadCSV(file, entityType, apiKey) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);

  const response = await fetch('http://localhost:3000/ims/oneroster/v1p2/csv/import', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.jobId;
}

// Poll job status
async function pollJobStatus(jobId, apiKey) {
  const response = await fetch(`http://localhost:3000/ims/oneroster/v1p2/csv/import/${jobId}`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });

  const job = await response.json();
  console.log(`Status: ${job.status}, Progress: ${job.progress}%`);

  if (job.status === 'completed') {
    console.log(`Success: ${job.successCount}, Errors: ${job.errorCount}`);
    return job;
  } else if (job.status === 'failed') {
    console.error('Job failed:', job.errors);
    throw new Error('Import failed');
  } else {
    // Poll again after 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    return pollJobStatus(jobId, apiKey);
  }
}

// Usage
const fileInput = document.getElementById('csvFile');
const file = fileInput.files[0];
const apiKey = 'your-api-key';

try {
  const jobId = await uploadCSV(file, 'users', apiKey);
  console.log('Job created:', jobId);

  const finalJob = await pollJobStatus(jobId, apiKey);
  console.log('Import completed:', finalJob);
} catch (error) {
  console.error('Import error:', error);
}
```

### Example 3: Python (requests)

```python
import requests
import time

API_BASE_URL = 'http://localhost:3000/ims/oneroster/v1p2/csv'
API_KEY = 'your-api-key'

def upload_csv(file_path, entity_type):
    """Upload CSV file and create import job"""
    headers = {'X-API-Key': API_KEY}

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'entityType': entity_type}

        response = requests.post(
            f'{API_BASE_URL}/import',
            headers=headers,
            files=files,
            data=data
        )
        response.raise_for_status()
        return response.json()['jobId']

def get_job_status(job_id):
    """Get import job status"""
    headers = {'X-API-Key': API_KEY}

    response = requests.get(
        f'{API_BASE_URL}/import/{job_id}',
        headers=headers
    )
    response.raise_for_status()
    return response.json()

def poll_job_until_complete(job_id, poll_interval=5):
    """Poll job status until completion or failure"""
    while True:
        job = get_job_status(job_id)
        status = job['status']

        print(f"Status: {status}, Progress: {job.get('progress', 0)}%")

        if status == 'completed':
            print(f"Success: {job['successCount']}, Errors: {job['errorCount']}")
            if job['errorCount'] > 0:
                print(f"First error: {job['errors'][0]}")
            return job
        elif status == 'failed':
            print(f"Job failed: {job.get('errors', [])}")
            raise Exception('Import job failed')

        time.sleep(poll_interval)

# Usage
if __name__ == '__main__':
    job_id = upload_csv('users.csv', 'users')
    print(f'Job created: {job_id}')

    final_job = poll_job_until_complete(job_id)
    print('Import completed:', final_job)
```

---

## Validation Rules

### Required Fields Validation

Each entity type has specific required fields. Missing required fields will result in validation errors.

### Data Type Validation

- **Status**: Must be `active` or `tobedeleted`
- **Dates**: ISO 8601 format
  - Date only: `YYYY-MM-DD` (e.g., `2025-01-15`)
  - DateTime: `YYYY-MM-DDTHH:mm:ssZ` (e.g., `2025-01-15T10:00:00Z`)
- **Booleans**: `true` or `false` (case-insensitive)
- **Email**: Standard email format (RFC 5322)

### OneRoster Enum Validation

#### User Roles
- `administrator`
- `aide`
- `guardian`
- `parent`
- `proctor`
- `relative`
- `student`
- `teacher`

#### Enrollment Roles
- `administrator`
- `aide`
- `proctor`
- `student`
- `teacher`

#### Org Types
- `department`
- `school`
- `district`
- `local`
- `state`
- `national`

#### Class Types
- `homeroom`
- `scheduled`

#### Session Types
- `gradingPeriod`
- `semester`
- `schoolYear`
- `term`

### Japan Profile Validation

#### Kana Name Validation

Kana fields (`metadata.jp.kanaGivenName`, `metadata.jp.kanaFamilyName`, `metadata.jp.kanaName`) must contain only:
- **Hiragana**: U+3040–U+309F (あ-ん)
- **Katakana**: U+30A0–U+30FF (ア-ン)
- **Allowed punctuation**: Spaces, `・` (middle dot), `ー` (long vowel mark)

**Valid examples**:
- `タロウ` ✅
- `ヤマダ` ✅
- `トウキョウトリツコウコウ` ✅
- `あきこ` ✅

**Invalid examples**:
- `Taro` ❌ (contains Latin characters)
- `タロウ123` ❌ (contains numbers)
- `山田` ❌ (contains kanji)

### Business Logic Validation

- **Date Ranges**: `startDate` must be before `endDate` (AcademicSessions)
- **Unique Constraints**: `sourcedId` must be unique within entity type

---

## Error Handling

### Error Response Format

```json
{
  "line": 123,
  "field": "metadata.jp.kanaGivenName",
  "value": "Taro123",
  "message": "Kana name must contain only hiragana or katakana characters",
  "code": "INVALID_KANA_NAME"
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|-----------|
| `MISSING_REQUIRED_FIELD` | Required field is missing | Add the missing field to CSV |
| `INVALID_STATUS` | Invalid status value | Use `active` or `tobedeleted` |
| `INVALID_DATE_FORMAT` | Invalid date format | Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ) |
| `INVALID_BOOLEAN` | Invalid boolean value | Use `true` or `false` |
| `INVALID_EMAIL` | Invalid email format | Use valid email format |
| `INVALID_ENUM_VALUE` | Invalid enum value | Use one of the allowed enum values |
| `INVALID_KANA_NAME` | Invalid kana name | Use only hiragana or katakana characters |
| `INVALID_DATE_RANGE` | Start date is after end date | Ensure startDate < endDate |
| `DUPLICATE_SOURCED_ID` | Duplicate sourcedId | Use unique sourcedId for each record |

### Error Limit

- **Maximum errors reported**: 100 errors per import job
- **Behavior**: If more than 100 errors occur, only the first 100 are reported
- **Job status**: Job continues processing even with errors (partial import)

---

## Performance Considerations

### File Size and Processing Time

| File Size | Record Count | Estimated Time |
|-----------|-------------|----------------|
| 1MB | ~5,000 records | < 1 minute |
| 10MB | ~50,000 records | 5-10 minutes |
| 50MB | ~200,000 records | 20-30 minutes |
| 100MB | ~400,000 records | 40-60 minutes |

### Optimization Tips

1. **Split large files**: For files > 100MB, split into multiple smaller files
2. **Remove unnecessary columns**: Include only required and used columns
3. **Validate locally first**: Pre-validate CSV files before upload to catch errors early
4. **Upload during off-peak hours**: Reduce server load by uploading during low-traffic periods
5. **Use batch imports**: Group related entities (e.g., upload all users, then all orgs, then enrollments)

### Memory Usage

- **Streaming parser**: Processes files line-by-line (constant memory usage ~50MB)
- **Batch inserts**: 1000 records buffered in memory at a time
- **Total memory**: ~100-200MB per import job

---

## Security

### Authentication

- **API Key required**: All upload requests must include valid API key in `X-API-Key` header
- **IP Whitelist**: API keys can be restricted to specific IP addresses

### File Upload Security

- **File size limit**: 100MB (prevents DoS attacks)
- **File type validation**: Only `.csv` files accepted
- **Virus scanning**: Not implemented (recommend implementing at reverse proxy level)

### Data Privacy

- **Audit logging**: All import operations logged with timestamp, user, and IP address
- **PII handling**: CSV files stored temporarily on server (recommend deletion after processing)
- **Encryption**: HTTPS/TLS for data in transit (infrastructure level)

### Rate Limiting

- **Default limit**: 1000 requests/hour per API key
- **Applies to**: All API endpoints including upload
- **Response header**: `X-RateLimit-Remaining` shows remaining quota

---

## Troubleshooting

### Issue 1: File Upload Fails with 413 Error

**Problem**: File size exceeds limit

**Solution**:
- Reduce file size or split into multiple files
- Contact administrator to increase file size limit

### Issue 2: Job Status Shows "Failed"

**Problem**: Import job failed

**Solution**:
1. Check `errors` array in job status response
2. Review first error for details
3. Fix CSV file based on error message
4. Re-upload corrected file

### Issue 3: Validation Errors for Kana Names

**Problem**: Kana names contain invalid characters

**Solution**:
- Ensure kana fields contain only hiragana or katakana
- Remove Latin characters, kanji, or numbers
- Use conversion tools to convert kanji to kana

### Issue 4: Slow Import Processing

**Problem**: Import takes longer than expected

**Solution**:
- Check file size (large files take longer)
- Monitor job progress via status API
- Ensure server has sufficient resources (CPU, memory)
- Consider splitting file into smaller batches

### Issue 5: Duplicate sourcedId Errors

**Problem**: CSV contains duplicate sourcedIds

**Solution**:
- Ensure each `sourcedId` is unique within the CSV file
- Use Excel or scripts to identify duplicates
- For updates, use existing sourcedIds (upsert will update records)

---

## Best Practices

### CSV Preparation

1. **Use UTF-8 encoding**: Save CSV files as UTF-8 in Excel or text editors
2. **Include header row**: Always include column names in first row
3. **Validate locally**: Check CSV format before upload
4. **Test with small file first**: Upload 10-100 records first to verify format

### Import Strategy

1. **Import in order**: Upload entities in dependency order
   - Orgs first
   - Users second
   - Courses third
   - Classes fourth
   - Enrollments fifth
   - AcademicSessions sixth
   - Demographics last

2. **Monitor progress**: Poll job status every 5-10 seconds
3. **Handle errors**: Review errors and fix CSV file
4. **Verify data**: Check database after import completes

### Production Deployment

1. **Backup database**: Always backup before bulk imports
2. **Schedule imports**: Run during off-peak hours
3. **Monitor resources**: Watch CPU, memory, and disk usage
4. **Set up alerts**: Configure alerts for failed imports
5. **Retain logs**: Keep import logs for audit purposes

---

## Related Documentation

- [CSV Export Guide](csv-export-implementation.md) - Exporting data to CSV
- [OneRoster API Reference](../../apps/api/README.md#api-reference) - Complete API documentation
- [OneRoster Japan Profile Specification](../research/oneroster-japan-profile-analysis.md) - Japan Profile details
- [Security Guide](security-guide.md) - Authentication and security

---

**Last Updated**: 2025-11-16
**Version**: 1.0.0
**Status**: Production Ready
