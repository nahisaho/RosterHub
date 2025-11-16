# Field Mapping Configuration

Flexible CSV field mapping system with transformation engine for custom data mappings.

## Overview

RosterHub's field mapping system allows organizations to define custom mappings between CSV columns and OneRoster entity fields. This enables import of CSV files with non-standard column names and formats.

## Features

- **Flexible Mappings**: Map any CSV column to any OneRoster field
- **13 Transformation Types**: Direct copy, concatenation, split, lookup, custom scripts, and more
- **Reusable Configurations**: Save and reuse mapping configurations
- **Default Configurations**: Set default mappings per entity type
- **Lookup Tables**: Define value mappings for data normalization
- **Validation**: Required field validation and custom validation rules
- **Transformation Chaining**: Apply multiple transformations in sequence

## Supported Transformation Types

| Type | Description | Config Example |
|------|-------------|----------------|
| `direct` | Direct field copy | `{}` |
| `constant` | Constant value | `{ value: "student" }` |
| `concatenate` | Join multiple fields | `{ separator: " ", trim: true }` |
| `split` | Split field by delimiter | `{ delimiter: ",", index: 0 }` |
| `lookup` | Value lookup from table | `{ tableName: "roleMapping" }` |
| `script` | Custom JavaScript | `{ expression: "value.toUpperCase()" }` |
| `dateFormat` | Date format conversion | `{ outputFormat: "YYYY-MM-DD" }` |
| `trim` | Trim whitespace | `{}` |
| `lowercase` | Convert to lowercase | `{}` |
| `uppercase` | Convert to uppercase | `{}` |
| `substring` | Extract substring | `{ start: 0, end: 10 }` |
| `replace` | Find and replace | `{ find: "-", replace: "" }` |
| `default` | Default if empty | `{ defaultValue: "Unknown" }` |

## Quick Start

### 1. Create Field Mapping Configuration

```bash
curl -X POST https://api.rosterhub.example.com/api/v1/field-mapping/configs \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard User Import",
    "entityType": "users",
    "organizationId": "org-12345",
    "isDefault": true,
    "fieldMappings": [
      {
        "targetField": "givenName",
        "sourceFields": ["first_name"],
        "transformationType": "trim",
        "isRequired": true
      },
      {
        "targetField": "familyName",
        "sourceFields": ["last_name"],
        "transformationType": "trim",
        "isRequired": true
      },
      {
        "targetField": "username",
        "sourceFields": ["first_name", "last_name"],
        "transformationType": "concatenate",
        "transformConfig": {
          "separator": ".",
          "trim": true
        }
      },
      {
        "targetField": "role",
        "sourceFields": ["user_type"],
        "transformationType": "lookup",
        "transformConfig": {
          "tableName": "userRoleMapping"
        }
      }
    ]
  }'
```

### 2. Create Lookup Table

```bash
curl -X POST https://api.rosterhub.example.com/api/v1/field-mapping/lookup-tables \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "userRoleMapping",
    "organizationId": "org-12345",
    "entries": [
      { "sourceValue": "S", "targetValue": "student" },
      { "sourceValue": "T", "targetValue": "teacher" },
      { "sourceValue": "A", "targetValue": "administrator" }
    ]
  }'
```

### 3. Use in CSV Import

The field mapping configuration will be automatically applied during CSV import when specified or when using the default configuration for the entity type.

## Examples

### Example 1: Name Concatenation

Map separate first/middle/last name columns to single field:

```json
{
  "targetField": "fullName",
  "sourceFields": ["first", "middle", "last"],
  "transformationType": "concatenate",
  "transformConfig": {
    "separator": " ",
    "trim": true
  }
}
```

### Example 2: Email Normalization

Convert email to lowercase:

```json
{
  "targetField": "email",
  "sourceFields": ["Email_Address"],
  "transformationType": "lowercase"
}
```

### Example 3: Role Mapping with Lookup

Map numeric codes to role names:

```json
{
  "targetField": "role",
  "sourceFields": ["role_code"],
  "transformationType": "lookup",
  "transformConfig": {
    "tableName": "roleCodeMapping",
    "defaultValue": "student"
  }
}
```

### Example 4: Custom Script Transformation

Generate username from name and ID:

```json
{
  "targetField": "username",
  "sourceFields": ["first_name", "student_id"],
  "transformationType": "script",
  "transformConfig": {
    "expression": "lowercase(values[0]) + values[1]"
  }
}
```

Available script variables:
- `value`: First source field value
- `values`: Array of all source field values
- `row`: Complete CSV row object
- `rowNumber`: Current row number
- Utility functions: `trim()`, `lowercase()`, `uppercase()`, `substring()`, `replace()`, `split()`, `join()`

### Example 5: Date Format Conversion

Convert date from MM/DD/YYYY to YYYY-MM-DD:

```json
{
  "targetField": "birthDate",
  "sourceFields": ["dob"],
  "transformationType": "dateFormat",
  "transformConfig": {
    "outputFormat": "YYYY-MM-DD"
  }
}
```

## API Reference

### POST /api/v1/field-mapping/configs

Create field mapping configuration.

### GET /api/v1/field-mapping/configs

List configurations for an organization.

**Query Parameters:**
- `organizationId` (required)
- `entityType` (optional)

### GET /api/v1/field-mapping/configs/:id

Get configuration details.

### GET /api/v1/field-mapping/configs/default/:entityType

Get default configuration for entity type.

**Query Parameters:**
- `organizationId` (required)

### PUT /api/v1/field-mapping/configs/:id

Update configuration.

### DELETE /api/v1/field-mapping/configs/:id

Delete configuration.

### POST /api/v1/field-mapping/configs/:id/set-default

Set configuration as default for its entity type.

## Best Practices

### 1. Use Descriptive Names

```json
{
  "name": "Standard User Import - Active Directory Format",
  "description": "Maps Active Directory CSV export to OneRoster User entity"
}
```

### 2. Validate Required Fields

```json
{
  "targetField": "sourcedId",
  "sourceFields": ["student_id"],
  "transformationType": "direct",
  "isRequired": true
}
```

### 3. Provide Default Values

```json
{
  "targetField": "middleName",
  "sourceFields": ["middle_name"],
  "transformationType": "default",
  "defaultValue": "",
  "isRequired": false
}
```

### 4. Use Lookup Tables for Value Mapping

Avoid hardcoding value mappings in scripts. Use lookup tables for maintainability:

```json
// Good
{
  "transformationType": "lookup",
  "transformConfig": { "tableName": "statusMapping" }
}

// Avoid
{
  "transformationType": "script",
  "transformConfig": {
    "expression": "value === 'A' ? 'active' : 'inactive'"
  }
}
```

### 5. Set Processing Order

For dependent transformations, use the `order` field:

```json
[
  {
    "targetField": "email",
    "transformationType": "trim",
    "order": 0
  },
  {
    "targetField": "email",
    "transformationType": "lowercase",
    "order": 1
  }
]
```

## Security Considerations

### Script Execution

- Scripts run in sandboxed VM context
- 1-second timeout per script
- No access to Node.js modules or file system
- Limited to provided utility functions

### Input Validation

- All transformations validate input data
- Required field validation enforced
- Custom validation rules supported via `validationRules` field

## Troubleshooting

### Transformation Errors

Check field mapping logs for detailed error messages:

```
Transformation error at row 105: Invalid date: 13/32/2025
Mapping error for field 'birthDate' at row 105
```

### Missing Required Fields

Ensure all required fields have valid source data:

```
Required field 'sourcedId' is missing at row 238
```

### Lookup Table Not Found

Verify lookup table exists and is active:

```bash
GET /api/v1/field-mapping/lookup-tables?organizationId=org-12345
```

## Support

For field mapping issues:
- Check transformation configuration
- Review error logs in import job details
- Test transformations with sample data
- Contact support: support@rosterhub.example.com
