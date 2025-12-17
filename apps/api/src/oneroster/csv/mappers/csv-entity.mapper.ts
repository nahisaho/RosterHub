/**
 * CSV Entity Mapper
 *
 * Maps CSV columns from OneRoster Japan Profile v1.2.2 to Prisma entities.
 *
 * OneRoster CSV Column Naming:
 * - Base specification uses camelCase (e.g., "sourcedId", "givenName")
 * - Japan Profile extensions use "metadata.jp.*" prefix
 *
 * Requirements Coverage:
 * - FR-CSV-001: CSV import with OneRoster Japan Profile mapping
 * - FR-VALID-001: Japan Profile validation (kanji/kana names)
 */

/**
 * User CSV Columns (OneRoster Japan Profile 1.2.2)
 *
 * Required columns:
 * - sourcedId, status, dateLastModified, enabledUser, givenName, familyName, role, username, email
 *
 * Japan Profile extensions (metadata.jp.*):
 * - metadata.jp.kanaGivenName, metadata.jp.kanaFamilyName, metadata.jp.homeClass
 */
export interface UserCsvRow {
  sourcedId: string;
  status: string;
  dateLastModified: string;
  enabledUser: string;
  orgSourcedIds?: string;
  role: string;
  username: string;
  userIds?: string;
  givenName: string;
  familyName: string;
  middleName?: string;
  identifier?: string;
  email?: string;
  sms?: string;
  phone?: string;
  agentSourcedIds?: string;
  grades?: string;
  password?: string;
  // Japan Profile extensions
  'metadata.jp.kanaGivenName'?: string;
  'metadata.jp.kanaFamilyName'?: string;
  'metadata.jp.homeClass'?: string;
  [key: string]: string | undefined;
}

/**
 * Org CSV Columns (OneRoster Japan Profile 1.2.2)
 */
export interface OrgCsvRow {
  sourcedId: string;
  status: string;
  dateLastModified: string;
  name: string;
  type: string;
  identifier?: string;
  parentSourcedId?: string;
  // Japan Profile extensions
  'metadata.jp.kanaName'?: string;
  'metadata.jp.orgCode'?: string;
  [key: string]: string | undefined;
}

/**
 * Class CSV Columns (OneRoster Japan Profile 1.2.2)
 */
export interface ClassCsvRow {
  sourcedId: string;
  status: string;
  dateLastModified: string;
  title: string;
  classCode?: string;
  classType: string;
  location?: string;
  grades?: string;
  subjects?: string;
  courseSourcedId: string;
  schoolSourcedId: string;
  termSourcedIds?: string;
  subjectCodes?: string;
  periods?: string;
  // Japan Profile extensions
  'metadata.jp.kanaTitle'?: string;
  'metadata.jp.specialNeeds'?: string;
  [key: string]: string | undefined;
}

/**
 * Course CSV Columns (OneRoster Japan Profile 1.2.2)
 */
export interface CourseCsvRow {
  sourcedId: string;
  status: string;
  dateLastModified: string;
  schoolYearSourcedId?: string;
  title: string;
  courseCode?: string;
  grades?: string;
  orgSourcedId: string;
  subjects?: string;
  subjectCodes?: string;
  // Japan Profile extensions
  'metadata.jp.kanaTitle'?: string;
  [key: string]: string | undefined;
}

/**
 * Enrollment CSV Columns (OneRoster Japan Profile 1.2.2)
 */
export interface EnrollmentCsvRow {
  sourcedId: string;
  status: string;
  dateLastModified: string;
  classSourcedId: string;
  schoolSourcedId: string;
  userSourcedId: string;
  role: string;
  primary?: string;
  beginDate?: string;
  endDate?: string;
  [key: string]: string | undefined;
}

/**
 * AcademicSession CSV Columns (OneRoster Japan Profile 1.2.2)
 */
export interface AcademicSessionCsvRow {
  sourcedId: string;
  status: string;
  dateLastModified: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  parentSourcedId?: string;
  schoolYear: string;
  // Japan Profile extensions
  'metadata.jp.kanaTitle'?: string;
  [key: string]: string | undefined;
}

/**
 * Demographic CSV Columns (OneRoster Japan Profile 1.2.2)
 */
export interface DemographicCsvRow {
  sourcedId: string;
  status: string;
  dateLastModified: string;
  birthDate?: string;
  sex?: string;
  americanIndianOrAlaskaNative?: string;
  asian?: string;
  blackOrAfricanAmerican?: string;
  nativeHawaiianOrOtherPacificIslander?: string;
  white?: string;
  demographicRaceTwoOrMoreRaces?: string;
  hispanicOrLatinoEthnicity?: string;
  countryOfBirthCode?: string;
  stateOfBirthAbbreviation?: string;
  cityOfBirth?: string;
  publicSchoolResidenceStatus?: string;
  [key: string]: string | undefined;
}

/**
 * CSV Row Type Union
 */
export type CsvRow =
  | UserCsvRow
  | OrgCsvRow
  | ClassCsvRow
  | CourseCsvRow
  | EnrollmentCsvRow
  | AcademicSessionCsvRow
  | DemographicCsvRow;

/**
 * CSV Entity Mapper
 *
 * Provides methods to map CSV rows to Prisma entity data.
 */
export class CsvEntityMapper {
  /**
   * Maps User CSV row to Prisma User data
   *
   * @param row - CSV row data
   * @returns Prisma User create input
   */
  static mapUserCsvRow(row: UserCsvRow): any {
    // Extract Japan Profile metadata
    const metadata: any = {};
    if (row['metadata.jp.kanaGivenName']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.kanaGivenName = row['metadata.jp.kanaGivenName'];
    }
    if (row['metadata.jp.kanaFamilyName']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.kanaFamilyName = row['metadata.jp.kanaFamilyName'];
    }
    if (row['metadata.jp.homeClass']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.homeClass = row['metadata.jp.homeClass'];
    }

    return {
      sourcedId: row.sourcedId,
      status: row.status || 'active',
      dateLastModified: new Date(row.dateLastModified),
      enabledUser: row.enabledUser === 'true',
      givenName: row.givenName,
      familyName: row.familyName,
      middleName: row.middleName,
      role: row.role,
      username: row.username,
      email: row.email,
      sms: row.sms,
      phone: row.phone,
      identifier: row.identifier,
      grades: row.grades,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Maps Org CSV row to Prisma Org data
   *
   * @param row - CSV row data
   * @returns Prisma Org create input
   */
  static mapOrgCsvRow(row: OrgCsvRow): any {
    const metadata: any = {};
    if (row['metadata.jp.kanaName']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.kanaName = row['metadata.jp.kanaName'];
    }
    if (row['metadata.jp.orgCode']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.orgCode = row['metadata.jp.orgCode'];
    }

    return {
      sourcedId: row.sourcedId,
      status: row.status || 'active',
      dateLastModified: new Date(row.dateLastModified),
      name: row.name,
      type: row.type,
      identifier: row.identifier,
      parentSourcedId: row.parentSourcedId,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Maps Class CSV row to Prisma Class data
   *
   * @param row - CSV row data
   * @returns Prisma Class create input
   */
  static mapClassCsvRow(row: ClassCsvRow): any {
    const metadata: any = {};
    if (row['metadata.jp.kanaTitle']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.kanaTitle = row['metadata.jp.kanaTitle'];
    }
    if (row['metadata.jp.specialNeeds']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.specialNeeds = row['metadata.jp.specialNeeds'];
    }

    return {
      sourcedId: row.sourcedId,
      status: row.status || 'active',
      dateLastModified: new Date(row.dateLastModified),
      title: row.title,
      classCode: row.classCode,
      classType: row.classType,
      location: row.location,
      grades: row.grades,
      subjects: row.subjects,
      subjectCodes: row.subjectCodes,
      periods: row.periods,
      courseSourcedId: row.courseSourcedId,
      schoolSourcedId: row.schoolSourcedId,
      termSourcedIds: row.termSourcedIds,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Maps Course CSV row to Prisma Course data
   *
   * @param row - CSV row data
   * @returns Prisma Course create input
   */
  static mapCourseCsvRow(row: CourseCsvRow): any {
    const metadata: any = {};
    if (row['metadata.jp.kanaTitle']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.kanaTitle = row['metadata.jp.kanaTitle'];
    }

    return {
      sourcedId: row.sourcedId,
      status: row.status || 'active',
      dateLastModified: new Date(row.dateLastModified),
      title: row.title,
      courseCode: row.courseCode,
      grades: row.grades,
      orgSourcedId: row.orgSourcedId,
      subjects: row.subjects,
      subjectCodes: row.subjectCodes,
      schoolYearSourcedId: row.schoolYearSourcedId,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Maps Enrollment CSV row to Prisma Enrollment data
   *
   * @param row - CSV row data
   * @returns Prisma Enrollment create input
   */
  static mapEnrollmentCsvRow(row: EnrollmentCsvRow): any {
    return {
      sourcedId: row.sourcedId,
      status: row.status || 'active',
      dateLastModified: new Date(row.dateLastModified),
      classSourcedId: row.classSourcedId,
      schoolSourcedId: row.schoolSourcedId,
      userSourcedId: row.userSourcedId,
      role: row.role,
      primary: row.primary === 'true',
      beginDate: row.beginDate ? new Date(row.beginDate) : undefined,
      endDate: row.endDate ? new Date(row.endDate) : undefined,
    };
  }

  /**
   * Maps AcademicSession CSV row to Prisma AcademicSession data
   *
   * @param row - CSV row data
   * @returns Prisma AcademicSession create input
   */
  static mapAcademicSessionCsvRow(row: AcademicSessionCsvRow): any {
    const metadata: any = {};
    if (row['metadata.jp.kanaTitle']) {
      metadata.jp = metadata.jp || {};
      metadata.jp.kanaTitle = row['metadata.jp.kanaTitle'];
    }

    return {
      sourcedId: row.sourcedId,
      status: row.status || 'active',
      dateLastModified: new Date(row.dateLastModified),
      title: row.title,
      type: row.type,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      parentSourcedId: row.parentSourcedId,
      schoolYear: row.schoolYear,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Maps Demographic CSV row to Prisma Demographic data
   *
   * @param row - CSV row data
   * @returns Prisma Demographic create input
   */
  static mapDemographicCsvRow(row: DemographicCsvRow): any {
    return {
      sourcedId: row.sourcedId,
      status: row.status || 'active',
      dateLastModified: new Date(row.dateLastModified),
      birthDate: row.birthDate ? new Date(row.birthDate) : undefined,
      sex: row.sex,
      americanIndianOrAlaskaNative: row.americanIndianOrAlaskaNative === 'true',
      asian: row.asian === 'true',
      blackOrAfricanAmerican: row.blackOrAfricanAmerican === 'true',
      nativeHawaiianOrOtherPacificIslander:
        row.nativeHawaiianOrOtherPacificIslander === 'true',
      white: row.white === 'true',
      demographicRaceTwoOrMoreRaces:
        row.demographicRaceTwoOrMoreRaces === 'true',
      hispanicOrLatinoEthnicity: row.hispanicOrLatinoEthnicity === 'true',
      countryOfBirthCode: row.countryOfBirthCode,
      stateOfBirthAbbreviation: row.stateOfBirthAbbreviation,
      cityOfBirth: row.cityOfBirth,
      publicSchoolResidenceStatus: row.publicSchoolResidenceStatus,
    };
  }
}
