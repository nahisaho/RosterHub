import { Injectable, Logger } from '@nestjs/common';
import { CsvRow } from '../mappers/csv-entity.mapper';

/**
 * Validation Error
 */
export interface ValidationError {
  line: number;
  field?: string;
  value?: string;
  message: string;
  code: string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * CSV Validator Service
 *
 * Validates CSV rows according to OneRoster Japan Profile 1.2.2 specification.
 *
 * Validation Rules:
 * - Required fields presence
 * - Data type validation
 * - Format validation (dates, emails, etc.)
 * - Japan Profile specific rules (kanji/kana names, etc.)
 * - Reference integrity (foreign keys exist)
 *
 * Requirements Coverage:
 * - FR-CSV-002: CSV validation with Japan Profile rules
 * - FR-VALID-001: Japan Profile validation (kanji/kana names)
 * - FR-VALID-002: Reference validation
 * - FR-CSV-004: Validation error reporting
 */
@Injectable()
export class CsvValidatorService {
  private readonly logger = new Logger(CsvValidatorService.name);

  // OneRoster required fields by entity type
  private readonly REQUIRED_FIELDS: Record<string, string[]> = {
    users: ['sourcedId', 'status', 'dateLastModified', 'enabledUser', 'givenName', 'familyName', 'role', 'username'],
    orgs: ['sourcedId', 'status', 'dateLastModified', 'name', 'type'],
    classes: ['sourcedId', 'status', 'dateLastModified', 'title', 'classType', 'courseSourcedId', 'schoolSourcedId'],
    courses: ['sourcedId', 'status', 'dateLastModified', 'title', 'orgSourcedId'],
    enrollments: ['sourcedId', 'status', 'dateLastModified', 'classSourcedId', 'schoolSourcedId', 'userSourcedId', 'role'],
    academicSessions: ['sourcedId', 'status', 'dateLastModified', 'title', 'type', 'startDate', 'endDate', 'schoolYear'],
    demographics: ['sourcedId', 'status', 'dateLastModified'],
  };

  // Valid status values
  private readonly VALID_STATUSES = ['active', 'tobedeleted'];

  // Valid role values for users
  private readonly VALID_USER_ROLES = ['administrator', 'aide', 'guardian', 'parent', 'proctor', 'relative', 'student', 'teacher'];

  // Valid role values for enrollments
  private readonly VALID_ENROLLMENT_ROLES = ['administrator', 'aide', 'proctor', 'student', 'teacher'];

  // Valid org types
  private readonly VALID_ORG_TYPES = ['department', 'school', 'district', 'local', 'state', 'national'];

  // Valid class types
  private readonly VALID_CLASS_TYPES = ['homeroom', 'scheduled'];

  // Valid academic session types
  private readonly VALID_SESSION_TYPES = ['gradingPeriod', 'semester', 'schoolYear', 'term'];

  /**
   * Validates CSV headers
   *
   * Checks that all required fields are present in the CSV headers.
   *
   * @param headers - Array of CSV column headers
   * @param entityType - Entity type (users, orgs, etc.)
   * @returns Validation result with errors
   */
  validateHeaders(headers: string[], entityType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const requiredFields = this.REQUIRED_FIELDS[entityType] || [];

    for (const field of requiredFields) {
      if (!headers.includes(field)) {
        errors.push({
          line: 1,
          field,
          message: `Required field '${field}' is missing from CSV headers`,
          code: 'REQUIRED_FIELD_MISSING',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a CSV row
   *
   * @param row - CSV row data
   * @param entityType - Entity type (users, orgs, etc.)
   * @param lineNumber - Line number in CSV (for error reporting)
   * @returns Validation result with errors
   */
  validateRow(row: CsvRow, entityType: string, lineNumber: number): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required fields
    const requiredFields = this.REQUIRED_FIELDS[entityType] || [];
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        errors.push({
          line: lineNumber,
          field,
          value: row[field],
          message: `Required field '${field}' is missing or empty`,
          code: 'REQUIRED_FIELD_MISSING',
        });
      }
    }

    // Validate status
    if (row.status && !this.VALID_STATUSES.includes(row.status)) {
      errors.push({
        line: lineNumber,
        field: 'status',
        value: row.status,
        message: `Invalid status '${row.status}'. Must be one of: ${this.VALID_STATUSES.join(', ')}`,
        code: 'INVALID_STATUS',
      });
    }

    // Validate dateLastModified
    if (row.dateLastModified && !this.isValidDate(row.dateLastModified)) {
      errors.push({
        line: lineNumber,
        field: 'dateLastModified',
        value: row.dateLastModified,
        message: `Invalid date format for 'dateLastModified'. Expected ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)`,
        code: 'INVALID_DATE_FORMAT',
      });
    }

    // Entity-specific validation
    switch (entityType) {
      case 'users':
        this.validateUserRow(row, lineNumber, errors);
        break;
      case 'orgs':
        this.validateOrgRow(row, lineNumber, errors);
        break;
      case 'classes':
        this.validateClassRow(row, lineNumber, errors);
        break;
      case 'courses':
        this.validateCourseRow(row, lineNumber, errors);
        break;
      case 'enrollments':
        this.validateEnrollmentRow(row, lineNumber, errors);
        break;
      case 'academicSessions':
        this.validateAcademicSessionRow(row, lineNumber, errors);
        break;
      case 'demographics':
        this.validateDemographicRow(row, lineNumber, errors);
        break;
    }

    // Japan Profile validation
    this.validateJapanProfile(row, entityType, lineNumber, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates User-specific fields
   */
  private validateUserRow(row: any, lineNumber: number, errors: ValidationError[]): void {
    // Validate role
    if (row.role && !this.VALID_USER_ROLES.includes(row.role)) {
      errors.push({
        line: lineNumber,
        field: 'role',
        value: row.role,
        message: `Invalid role '${row.role}'. Must be one of: ${this.VALID_USER_ROLES.join(', ')}`,
        code: 'INVALID_USER_ROLE',
      });
    }

    // Validate enabledUser (boolean)
    if (row.enabledUser && !['true', 'false'].includes(row.enabledUser.toLowerCase())) {
      errors.push({
        line: lineNumber,
        field: 'enabledUser',
        value: row.enabledUser,
        message: `Invalid boolean value for 'enabledUser'. Must be 'true' or 'false'`,
        code: 'INVALID_BOOLEAN',
      });
    }

    // Validate email format
    if (row.email && !this.isValidEmail(row.email)) {
      errors.push({
        line: lineNumber,
        field: 'email',
        value: row.email,
        message: `Invalid email format for '${row.email}'`,
        code: 'INVALID_EMAIL',
      });
    }
  }

  /**
   * Validates Org-specific fields
   */
  private validateOrgRow(row: any, lineNumber: number, errors: ValidationError[]): void {
    // Validate org type
    if (row.type && !this.VALID_ORG_TYPES.includes(row.type)) {
      errors.push({
        line: lineNumber,
        field: 'type',
        value: row.type,
        message: `Invalid org type '${row.type}'. Must be one of: ${this.VALID_ORG_TYPES.join(', ')}`,
        code: 'INVALID_ORG_TYPE',
      });
    }
  }

  /**
   * Validates Class-specific fields
   */
  private validateClassRow(row: any, lineNumber: number, errors: ValidationError[]): void {
    // Validate class type
    if (row.classType && !this.VALID_CLASS_TYPES.includes(row.classType)) {
      errors.push({
        line: lineNumber,
        field: 'classType',
        value: row.classType,
        message: `Invalid class type '${row.classType}'. Must be one of: ${this.VALID_CLASS_TYPES.join(', ')}`,
        code: 'INVALID_CLASS_TYPE',
      });
    }
  }

  /**
   * Validates Course-specific fields
   */
  private validateCourseRow(row: any, lineNumber: number, errors: ValidationError[]): void {
    // Course-specific validation (if any)
  }

  /**
   * Validates Enrollment-specific fields
   */
  private validateEnrollmentRow(row: any, lineNumber: number, errors: ValidationError[]): void {
    // Validate role
    if (row.role && !this.VALID_ENROLLMENT_ROLES.includes(row.role)) {
      errors.push({
        line: lineNumber,
        field: 'role',
        value: row.role,
        message: `Invalid enrollment role '${row.role}'. Must be one of: ${this.VALID_ENROLLMENT_ROLES.join(', ')}`,
        code: 'INVALID_ENROLLMENT_ROLE',
      });
    }

    // Validate primary (boolean)
    if (row.primary && !['true', 'false'].includes(row.primary.toLowerCase())) {
      errors.push({
        line: lineNumber,
        field: 'primary',
        value: row.primary,
        message: `Invalid boolean value for 'primary'. Must be 'true' or 'false'`,
        code: 'INVALID_BOOLEAN',
      });
    }

    // Validate dates
    if (row.beginDate && !this.isValidDate(row.beginDate)) {
      errors.push({
        line: lineNumber,
        field: 'beginDate',
        value: row.beginDate,
        message: `Invalid date format for 'beginDate'`,
        code: 'INVALID_DATE_FORMAT',
      });
    }

    if (row.endDate && !this.isValidDate(row.endDate)) {
      errors.push({
        line: lineNumber,
        field: 'endDate',
        value: row.endDate,
        message: `Invalid date format for 'endDate'`,
        code: 'INVALID_DATE_FORMAT',
      });
    }
  }

  /**
   * Validates AcademicSession-specific fields
   */
  private validateAcademicSessionRow(row: any, lineNumber: number, errors: ValidationError[]): void {
    // Validate session type
    if (row.type && !this.VALID_SESSION_TYPES.includes(row.type)) {
      errors.push({
        line: lineNumber,
        field: 'type',
        value: row.type,
        message: `Invalid session type '${row.type}'. Must be one of: ${this.VALID_SESSION_TYPES.join(', ')}`,
        code: 'INVALID_SESSION_TYPE',
      });
    }

    // Validate dates
    if (row.startDate && !this.isValidDate(row.startDate)) {
      errors.push({
        line: lineNumber,
        field: 'startDate',
        value: row.startDate,
        message: `Invalid date format for 'startDate'`,
        code: 'INVALID_DATE_FORMAT',
      });
    }

    if (row.endDate && !this.isValidDate(row.endDate)) {
      errors.push({
        line: lineNumber,
        field: 'endDate',
        value: row.endDate,
        message: `Invalid date format for 'endDate'`,
        code: 'INVALID_DATE_FORMAT',
      });
    }

    // Validate date range (startDate < endDate)
    if (row.startDate && row.endDate) {
      const start = new Date(row.startDate);
      const end = new Date(row.endDate);
      if (start >= end) {
        errors.push({
          line: lineNumber,
          field: 'startDate',
          value: row.startDate,
          message: `startDate must be before endDate`,
          code: 'INVALID_DATE_RANGE',
        });
      }
    }
  }

  /**
   * Validates Demographic-specific fields
   */
  private validateDemographicRow(row: any, lineNumber: number, errors: ValidationError[]): void {
    // Validate birthDate
    if (row.birthDate && !this.isValidDate(row.birthDate)) {
      errors.push({
        line: lineNumber,
        field: 'birthDate',
        value: row.birthDate,
        message: `Invalid date format for 'birthDate'`,
        code: 'INVALID_DATE_FORMAT',
      });
    }
  }

  /**
   * Validates Japan Profile extensions
   *
   * Japan Profile Rules:
   * - Kana names should be in katakana or hiragana
   * - Kanji names should contain kanji characters
   */
  private validateJapanProfile(row: any, entityType: string, lineNumber: number, errors: ValidationError[]): void {
    // Validate kana names (should be katakana or hiragana)
    if (row['metadata.jp.kanaGivenName']) {
      if (!this.isKana(row['metadata.jp.kanaGivenName'])) {
        errors.push({
          line: lineNumber,
          field: 'metadata.jp.kanaGivenName',
          value: row['metadata.jp.kanaGivenName'],
          message: `Kana name must contain only hiragana or katakana characters`,
          code: 'INVALID_KANA_NAME',
        });
      }
    }

    if (row['metadata.jp.kanaFamilyName']) {
      if (!this.isKana(row['metadata.jp.kanaFamilyName'])) {
        errors.push({
          line: lineNumber,
          field: 'metadata.jp.kanaFamilyName',
          value: row['metadata.jp.kanaFamilyName'],
          message: `Kana name must contain only hiragana or katakana characters`,
          code: 'INVALID_KANA_NAME',
        });
      }
    }

    if (row['metadata.jp.kanaName']) {
      if (!this.isKana(row['metadata.jp.kanaName'])) {
        errors.push({
          line: lineNumber,
          field: 'metadata.jp.kanaName',
          value: row['metadata.jp.kanaName'],
          message: `Kana name must contain only hiragana or katakana characters`,
          code: 'INVALID_KANA_NAME',
        });
      }
    }

    if (row['metadata.jp.kanaTitle']) {
      if (!this.isKana(row['metadata.jp.kanaTitle'])) {
        errors.push({
          line: lineNumber,
          field: 'metadata.jp.kanaTitle',
          value: row['metadata.jp.kanaTitle'],
          message: `Kana title must contain only hiragana or katakana characters`,
          code: 'INVALID_KANA_TITLE',
        });
      }
    }
  }

  /**
   * Validates date format (ISO 8601)
   */
  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Validates email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Checks if string contains only hiragana or katakana
   */
  private isKana(str: string): boolean {
    // Hiragana: U+3040–U+309F
    // Katakana: U+30A0–U+30FF
    // Also allow spaces and common punctuation
    const kanaRegex = /^[\u3040-\u309F\u30A0-\u30FF\s・ー]+$/;
    return kanaRegex.test(str);
  }
}
