/**
 * OneRoster API Type Definitions
 *
 * TypeScript types for OneRoster v1.2 Japan Profile entities and API responses.
 */

/**
 * Common base type for all OneRoster entities
 */
export interface BaseEntity {
  sourcedId: string;
  status: 'active' | 'tobedeleted';
  dateLastModified: string;
  metadata?: {
    jp?: Record<string, any>;
  };
}

/**
 * OneRoster User entity
 */
export interface User extends BaseEntity {
  enabledUser: boolean;
  username: string;
  userIds?: string[];
  givenName: string;
  familyName: string;
  middleName?: string;
  role: 'student' | 'teacher' | 'administrator' | 'aide' | 'guardian' | 'parent' | 'proctor' | 'relative' | 'systemAdministrator';
  identifier?: string;
  email?: string;
  sms?: string;
  phone?: string;
  agentSourcedIds?: string[];
  orgSourcedIds: string[];
  grades?: string[];
}

/**
 * OneRoster Org (Organization) entity
 */
export interface Org extends BaseEntity {
  name: string;
  type: 'department' | 'school' | 'district' | 'local' | 'state' | 'national';
  identifier?: string;
  parentSourcedId?: string;
}

/**
 * OneRoster Class entity
 */
export interface Class extends BaseEntity {
  title: string;
  classCode?: string;
  classType: 'homeroom' | 'scheduled';
  location?: string;
  grades?: string[];
  subjects?: string[];
  courseSourcedId: string;
  schoolSourcedId: string;
  termSourcedIds: string[];
  subjectCodes?: string[];
  periods?: string[];
}

/**
 * OneRoster Course entity
 */
export interface Course extends BaseEntity {
  title: string;
  schoolYearSourcedId: string;
  courseCode?: string;
  grades?: string[];
  subjects?: string[];
  orgSourcedId: string;
  subjectCodes?: string[];
}

/**
 * OneRoster Enrollment entity
 */
export interface Enrollment extends BaseEntity {
  role: 'student' | 'teacher' | 'administrator' | 'aide' | 'guardian' | 'parent' | 'proctor' | 'relative';
  primary?: boolean;
  classSourcedId: string;
  schoolSourcedId: string;
  userSourcedId: string;
  beginDate?: string;
  endDate?: string;
}

/**
 * OneRoster Demographic entity
 */
export interface Demographic extends BaseEntity {
  birthDate?: string;
  sex?: 'male' | 'female' | 'other';
  americanIndianOrAlaskaNative?: boolean;
  asian?: boolean;
  blackOrAfricanAmerican?: boolean;
  nativeHawaiianOrOtherPacificIslander?: boolean;
  white?: boolean;
  demographicRaceTwoOrMoreRaces?: boolean;
  hispanicOrLatinoEthnicity?: boolean;
  countryOfBirthCode?: string;
  stateOfBirthAbbreviation?: string;
  cityOfBirth?: string;
  publicSchoolResidenceStatus?: string;
  userSourcedId: string;
}

/**
 * OneRoster AcademicSession entity
 */
export interface AcademicSession extends BaseEntity {
  title: string;
  type: 'gradingPeriod' | 'semester' | 'schoolYear' | 'term';
  startDate: string;
  endDate: string;
  parentSourcedId?: string;
  schoolYear: string;
}

/**
 * CSV Import Job status
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * CSV Import Job entity
 */
export interface CsvImportJob {
  jobId: string;
  entityType: 'users' | 'orgs' | 'classes' | 'courses' | 'enrollments' | 'demographics' | 'academicSessions';
  status: JobStatus;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  startedAt?: string;
  completedAt?: string;
  totalRecords?: number;
  processedRecords?: number;
  successRecords?: number;
  failedRecords?: number;
  errors?: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

/**
 * API response wrapper for single entity
 */
export interface SingleEntityResponse<T> {
  [key: string]: T;
}

/**
 * API response wrapper for entity lists
 */
export interface EntityListResponse<T> {
  [key: string]: T[];
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  limit: number;
  offset: number;
  total?: number;
}

/**
 * CSV Export request parameters
 */
export interface CsvExportParams {
  entityType: 'users' | 'orgs' | 'classes' | 'courses' | 'enrollments' | 'demographics' | 'academicSessions';
  filter?: string;
  delta?: string; // ISO date string for incremental export
}

/**
 * CSV Import request
 */
export interface CsvImportRequest {
  entityType: 'users' | 'orgs' | 'classes' | 'courses' | 'enrollments' | 'demographics' | 'academicSessions';
  file: File;
}

/**
 * API Error response
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: any;
}
