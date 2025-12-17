import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Field Selection Service
 *
 * Implements OneRoster v1.2 field selection pattern using the `fields` query parameter.
 *
 * Examples:
 * - GET /users?fields=sourcedId,givenName,familyName,email
 * - GET /classes?fields=sourcedId,title,classCode
 *
 * This reduces payload size by returning only requested fields.
 *
 * Requirements Coverage:
 * - FR-API-016~020: Field selection for REST API
 *
 * @service
 */
@Injectable()
export class FieldSelectionService {
  /**
   * Parses the fields query parameter and returns a Prisma select object
   *
   * @param fields - Comma-separated list of field names
   * @param allowedFields - List of fields that can be selected (for security)
   * @returns Prisma select object
   * @throws BadRequestException if invalid field names are provided
   */
  parseFields(fields: string, allowedFields?: string[]): any {
    if (!fields || fields.trim() === '') {
      return undefined; // Return all fields
    }

    const fieldList = fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (fieldList.length === 0) {
      return undefined;
    }

    // Validate fields if allowedFields is provided
    if (allowedFields) {
      const invalidFields = fieldList.filter((f) => !allowedFields.includes(f));
      if (invalidFields.length > 0) {
        throw new BadRequestException(
          `Invalid field names: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
        );
      }
    }

    // Convert to Prisma select object
    const select: any = {};
    for (const field of fieldList) {
      select[field] = true;
    }

    return select;
  }

  /**
   * Filters an entity object to include only selected fields
   *
   * Useful when Prisma select is not available (e.g., for computed fields).
   *
   * @param entity - Entity object
   * @param fields - Comma-separated list of field names
   * @returns Filtered entity object
   */
  filterEntity(entity: any, fields: string): any {
    if (!fields || fields.trim() === '') {
      return entity; // Return all fields
    }

    const fieldList = fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (fieldList.length === 0) {
      return entity;
    }

    const filtered: any = {};
    for (const field of fieldList) {
      if (field in entity) {
        filtered[field] = entity[field];
      }
    }

    return filtered;
  }

  /**
   * Filters an array of entities to include only selected fields
   *
   * @param entities - Array of entity objects
   * @param fields - Comma-separated list of field names
   * @returns Array of filtered entity objects
   */
  filterEntities(entities: any[], fields: string): any[] {
    if (!fields || fields.trim() === '') {
      return entities; // Return all fields
    }

    return entities.map((entity) => this.filterEntity(entity, fields));
  }

  /**
   * Gets the allowed fields for a specific entity type
   *
   * This list includes all fields defined in the OneRoster specification.
   *
   * @param entityType - Entity type (users, orgs, classes, etc.)
   * @returns Array of allowed field names
   */
  getAllowedFields(entityType: string): string[] {
    const allowedFields: Record<string, string[]> = {
      users: [
        'sourcedId',
        'status',
        'dateLastModified',
        'enabledUser',
        'orgSourcedIds',
        'role',
        'username',
        'userIds',
        'givenName',
        'familyName',
        'middleName',
        'identifier',
        'email',
        'sms',
        'phone',
        'agentSourcedIds',
        'grades',
        'metadata',
      ],
      orgs: [
        'sourcedId',
        'status',
        'dateLastModified',
        'name',
        'type',
        'identifier',
        'parentSourcedId',
        'metadata',
      ],
      classes: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'classCode',
        'classType',
        'location',
        'grades',
        'subjects',
        'courseSourcedId',
        'schoolSourcedId',
        'termSourcedIds',
        'subjectCodes',
        'periods',
        'metadata',
      ],
      courses: [
        'sourcedId',
        'status',
        'dateLastModified',
        'schoolYearSourcedId',
        'title',
        'courseCode',
        'grades',
        'orgSourcedId',
        'subjects',
        'subjectCodes',
        'metadata',
      ],
      enrollments: [
        'sourcedId',
        'status',
        'dateLastModified',
        'classSourcedId',
        'schoolSourcedId',
        'userSourcedId',
        'role',
        'primary',
        'beginDate',
        'endDate',
        'metadata',
      ],
      academicSessions: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'type',
        'startDate',
        'endDate',
        'parentSourcedId',
        'schoolYear',
        'metadata',
      ],
      demographics: [
        'sourcedId',
        'status',
        'dateLastModified',
        'birthDate',
        'sex',
        'americanIndianOrAlaskaNative',
        'asian',
        'blackOrAfricanAmerican',
        'nativeHawaiianOrOtherPacificIslander',
        'white',
        'demographicRaceTwoOrMoreRaces',
        'hispanicOrLatinoEthnicity',
        'countryOfBirthCode',
        'stateOfBirthAbbreviation',
        'cityOfBirth',
        'publicSchoolResidenceStatus',
        'metadata',
      ],
    };

    return allowedFields[entityType] || [];
  }

  /**
   * Gets the filterable fields for a specific entity type
   *
   * Some fields are not suitable for filtering (e.g., large text fields, JSONB).
   *
   * @param entityType - Entity type
   * @returns Array of filterable field names
   */
  getFilterableFields(entityType: string): string[] {
    const filterableFields: Record<string, string[]> = {
      users: [
        'sourcedId',
        'status',
        'dateLastModified',
        'enabledUser',
        'role',
        'username',
        'givenName',
        'familyName',
        'email',
        'grades',
      ],
      orgs: [
        'sourcedId',
        'status',
        'dateLastModified',
        'name',
        'type',
        'identifier',
        'parentSourcedId',
      ],
      classes: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'classCode',
        'classType',
        'courseSourcedId',
        'schoolSourcedId',
        'grades',
        'subjects',
      ],
      courses: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'courseCode',
        'orgSourcedId',
        'grades',
        'subjects',
      ],
      enrollments: [
        'sourcedId',
        'status',
        'dateLastModified',
        'classSourcedId',
        'schoolSourcedId',
        'userSourcedId',
        'role',
        'primary',
        'beginDate',
        'endDate',
      ],
      academicSessions: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'type',
        'startDate',
        'endDate',
        'parentSourcedId',
        'schoolYear',
      ],
      demographics: [
        'sourcedId',
        'status',
        'dateLastModified',
        'birthDate',
        'sex',
      ],
    };

    return filterableFields[entityType] || [];
  }

  /**
   * Gets the sortable fields for a specific entity type
   *
   * @param entityType - Entity type
   * @returns Array of sortable field names
   */
  getSortableFields(entityType: string): string[] {
    // Most fields are sortable except JSONB and array fields
    const sortableFields: Record<string, string[]> = {
      users: [
        'sourcedId',
        'status',
        'dateLastModified',
        'enabledUser',
        'role',
        'username',
        'givenName',
        'familyName',
        'email',
      ],
      orgs: [
        'sourcedId',
        'status',
        'dateLastModified',
        'name',
        'type',
        'identifier',
      ],
      classes: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'classCode',
        'classType',
        'courseSourcedId',
        'schoolSourcedId',
      ],
      courses: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'courseCode',
        'orgSourcedId',
      ],
      enrollments: [
        'sourcedId',
        'status',
        'dateLastModified',
        'classSourcedId',
        'schoolSourcedId',
        'userSourcedId',
        'role',
        'primary',
        'beginDate',
        'endDate',
      ],
      academicSessions: [
        'sourcedId',
        'status',
        'dateLastModified',
        'title',
        'type',
        'startDate',
        'endDate',
        'schoolYear',
      ],
      demographics: [
        'sourcedId',
        'status',
        'dateLastModified',
        'birthDate',
        'sex',
      ],
    };

    return sortableFields[entityType] || [];
  }
}
