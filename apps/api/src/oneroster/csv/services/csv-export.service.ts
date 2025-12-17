import { Injectable, Logger } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { PrismaService } from '../../../database/prisma.service';
import { UsersRepository } from '../../entities/users/users.repository';
import { OrgsRepository } from '../../entities/orgs/orgs.repository';
import { ClassesRepository } from '../../entities/classes/classes.repository';
import { CoursesRepository } from '../../entities/courses/courses.repository';
import { EnrollmentsRepository } from '../../entities/enrollments/enrollments.repository';
import { AcademicSessionsRepository } from '../../entities/academic-sessions/academic-sessions.repository';
import { DemographicsRepository } from '../../entities/demographics/demographics.repository';

/**
 * CSV Export Service
 *
 * Generates OneRoster Japan Profile 1.2.2 compliant CSV files.
 *
 * Features:
 * - Streaming CSV generation (handles large datasets)
 * - OneRoster Japan Profile formatting
 * - Metadata.jp.* column flattening
 * - Memory-efficient batch processing
 *
 * Requirements Coverage:
 * - FR-CSV-006: CSV export with OneRoster Japan Profile formatting
 * - FR-CSV-007: Delta export (dateLastModified filtering)
 * - NFR-PERF-003: Export 200,000+ records efficiently
 */
@Injectable()
export class CsvExportService {
  private readonly logger = new Logger(CsvExportService.name);
  private readonly BATCH_SIZE = 1000; // Fetch 1000 records per batch

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly orgsRepository: OrgsRepository,
    private readonly classesRepository: ClassesRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly academicSessionsRepository: AcademicSessionsRepository,
    private readonly demographicsRepository: DemographicsRepository,
  ) {}

  /**
   * Exports entity data to CSV file
   *
   * @param entityType - Entity type (users, orgs, classes, etc.)
   * @param filePath - Output file path
   * @param options - Export options (filters, delta sync)
   * @returns Export result with record count
   */
  async exportToCsv(
    entityType: string,
    filePath: string,
    options: CsvExportOptions = {},
  ): Promise<CsvExportResult> {
    this.logger.log(`Starting CSV export for entity type: ${entityType}`);

    try {
      // Get repository
      const repository = this.getRepository(entityType);
      if (!repository) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      // Get CSV columns for entity type
      const columns = this.getEntityColumns(entityType);

      // Create write stream
      const writeStream = createWriteStream(filePath, { encoding: 'utf-8' });

      // Create CSV stringifier
      const csvStringifier = stringify({
        header: true,
        columns: columns.map((col) => col.key),
        quoted_string: true,
      });

      // Create readable stream from database query
      const dataStream = this.createDataStream(repository, entityType, options);

      // Pipeline: dataStream -> csvStringifier -> writeStream
      await pipeline(dataStream, csvStringifier, writeStream);

      const recordCount = (dataStream as any).recordCount || 0;

      this.logger.log(
        `CSV export completed: ${recordCount} records exported to ${filePath}`,
      );

      return {
        success: true,
        filePath,
        recordCount,
        entityType,
      };
    } catch (error) {
      this.logger.error(`CSV export failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Creates a readable stream from database query
   *
   * Fetches records in batches to avoid memory issues.
   *
   * @param repository - Entity repository
   * @param entityType - Entity type
   * @param options - Export options
   * @returns Readable stream
   */
  private createDataStream(
    repository: any,
    entityType: string,
    options: CsvExportOptions,
  ): Readable {
    let offset = 0;
    let hasMore = true;
    let recordCount = 0;
    const batchSize = this.BATCH_SIZE;
    const entityToCsvRowFn = this.entityToCsvRow.bind(this);

    const stream = new Readable({
      objectMode: true,
      read() {
        if (!hasMore) {
          this.push(null); // End stream
          return;
        }

        // Fetch batch of records using Prisma format
        const whereClause: any = {};

        // Delta export: filter by dateLastModified
        if (options.since) {
          whereClause.dateLastModified = { gte: options.since };
        }

        // Status filter
        if (options.status) {
          whereClause.status = options.status;
        }

        void (async () => {
          try {
            const records = await repository.findAll({
              where: whereClause,
              skip: offset,
              take: batchSize,
            });

            if (records.length === 0) {
              hasMore = false;
              this.push(null); // End stream
              return;
            }

            // Convert records to CSV rows
            for (const record of records) {
              const csvRow = entityToCsvRowFn(record, entityType);
              this.push(csvRow);
              recordCount++;
            }

            offset += records.length;

            // Check if we have more records
            if (records.length < batchSize) {
              hasMore = false;
            }
          } catch (error) {
            this.destroy(error as Error);
          }
        })();
      },
    });

    // Store record count on stream for reporting
    (stream as any).recordCount = recordCount;

    return stream;
  }

  /**
   * Converts entity to CSV row
   *
   * Flattens nested metadata.jp.* fields to top-level columns.
   *
   * @param entity - Entity object
   * @param entityType - Entity type
   * @returns CSV row object
   */
  private entityToCsvRow(entity: any, entityType: string): any {
    const row: any = {};

    // Base fields
    row.sourcedId = entity.sourcedId;
    row.status = entity.status;
    row.dateLastModified = entity.dateLastModified?.toISOString().split('T')[0]; // YYYY-MM-DD

    // Entity-specific fields
    switch (entityType) {
      case 'users':
        return this.userToCsvRow(entity);
      case 'orgs':
        return this.orgToCsvRow(entity);
      case 'classes':
        return this.classToCsvRow(entity);
      case 'courses':
        return this.courseToCsvRow(entity);
      case 'enrollments':
        return this.enrollmentToCsvRow(entity);
      case 'academicSessions':
        return this.academicSessionToCsvRow(entity);
      case 'demographics':
        return this.demographicToCsvRow(entity);
      default:
        return row;
    }
  }

  /**
   * Converts User entity to CSV row
   */
  private userToCsvRow(user: any): any {
    const row: any = {
      sourcedId: user.sourcedId,
      status: user.status,
      dateLastModified: user.dateLastModified?.toISOString().split('T')[0],
      enabledUser: user.enabledUser ? 'true' : 'false',
      orgSourcedIds: user.orgSourcedIds || '',
      role: user.role,
      username: user.username,
      userIds: user.userIds || '',
      givenName: user.givenName,
      familyName: user.familyName,
      middleName: user.middleName || '',
      identifier: user.identifier || '',
      email: user.email || '',
      sms: user.sms || '',
      phone: user.phone || '',
      agentSourcedIds: user.agentSourcedIds || '',
      grades: user.grades || '',
      password: '', // Never export passwords
    };

    // Japan Profile metadata
    if (user.metadata?.jp) {
      row['metadata.jp.kanaGivenName'] = user.metadata.jp.kanaGivenName || '';
      row['metadata.jp.kanaFamilyName'] = user.metadata.jp.kanaFamilyName || '';
      row['metadata.jp.homeClass'] = user.metadata.jp.homeClass || '';
    }

    return row;
  }

  /**
   * Converts Org entity to CSV row
   */
  private orgToCsvRow(org: any): any {
    const row: any = {
      sourcedId: org.sourcedId,
      status: org.status,
      dateLastModified: org.dateLastModified?.toISOString().split('T')[0],
      name: org.name,
      type: org.type,
      identifier: org.identifier || '',
      parentSourcedId: org.parentSourcedId || '',
    };

    // Japan Profile metadata
    if (org.metadata?.jp) {
      row['metadata.jp.kanaName'] = org.metadata.jp.kanaName || '';
      row['metadata.jp.orgCode'] = org.metadata.jp.orgCode || '';
    }

    return row;
  }

  /**
   * Converts Class entity to CSV row
   */
  private classToCsvRow(classEntity: any): any {
    const row: any = {
      sourcedId: classEntity.sourcedId,
      status: classEntity.status,
      dateLastModified: classEntity.dateLastModified
        ?.toISOString()
        .split('T')[0],
      title: classEntity.title,
      classCode: classEntity.classCode || '',
      classType: classEntity.classType,
      location: classEntity.location || '',
      grades: classEntity.grades || '',
      subjects: classEntity.subjects || '',
      courseSourcedId: classEntity.courseSourcedId,
      schoolSourcedId: classEntity.schoolSourcedId,
      termSourcedIds: classEntity.termSourcedIds || '',
      subjectCodes: classEntity.subjectCodes || '',
      periods: classEntity.periods || '',
    };

    // Japan Profile metadata
    if (classEntity.metadata?.jp) {
      row['metadata.jp.kanaTitle'] = classEntity.metadata.jp.kanaTitle || '';
      row['metadata.jp.specialNeeds'] =
        classEntity.metadata.jp.specialNeeds || '';
    }

    return row;
  }

  /**
   * Converts Course entity to CSV row
   */
  private courseToCsvRow(course: any): any {
    const row: any = {
      sourcedId: course.sourcedId,
      status: course.status,
      dateLastModified: course.dateLastModified?.toISOString().split('T')[0],
      schoolYearSourcedId: course.schoolYearSourcedId || '',
      title: course.title,
      courseCode: course.courseCode || '',
      grades: course.grades || '',
      orgSourcedId: course.orgSourcedId,
      subjects: course.subjects || '',
      subjectCodes: course.subjectCodes || '',
    };

    // Japan Profile metadata
    if (course.metadata?.jp) {
      row['metadata.jp.kanaTitle'] = course.metadata.jp.kanaTitle || '';
    }

    return row;
  }

  /**
   * Converts Enrollment entity to CSV row
   */
  private enrollmentToCsvRow(enrollment: any): any {
    return {
      sourcedId: enrollment.sourcedId,
      status: enrollment.status,
      dateLastModified: enrollment.dateLastModified
        ?.toISOString()
        .split('T')[0],
      classSourcedId: enrollment.classSourcedId,
      schoolSourcedId: enrollment.schoolSourcedId,
      userSourcedId: enrollment.userSourcedId,
      role: enrollment.role,
      primary: enrollment.primary ? 'true' : 'false',
      beginDate: enrollment.beginDate?.toISOString().split('T')[0] || '',
      endDate: enrollment.endDate?.toISOString().split('T')[0] || '',
    };
  }

  /**
   * Converts AcademicSession entity to CSV row
   */
  private academicSessionToCsvRow(session: any): any {
    const row: any = {
      sourcedId: session.sourcedId,
      status: session.status,
      dateLastModified: session.dateLastModified?.toISOString().split('T')[0],
      title: session.title,
      type: session.type,
      startDate: session.startDate?.toISOString().split('T')[0],
      endDate: session.endDate?.toISOString().split('T')[0],
      parentSourcedId: session.parentSourcedId || '',
      schoolYear: session.schoolYear,
    };

    // Japan Profile metadata
    if (session.metadata?.jp) {
      row['metadata.jp.kanaTitle'] = session.metadata.jp.kanaTitle || '';
    }

    return row;
  }

  /**
   * Converts Demographic entity to CSV row
   */
  private demographicToCsvRow(demographic: any): any {
    return {
      sourcedId: demographic.sourcedId,
      status: demographic.status,
      dateLastModified: demographic.dateLastModified
        ?.toISOString()
        .split('T')[0],
      birthDate: demographic.birthDate?.toISOString().split('T')[0] || '',
      sex: demographic.sex || '',
      americanIndianOrAlaskaNative: demographic.americanIndianOrAlaskaNative
        ? 'true'
        : 'false',
      asian: demographic.asian ? 'true' : 'false',
      blackOrAfricanAmerican: demographic.blackOrAfricanAmerican
        ? 'true'
        : 'false',
      nativeHawaiianOrOtherPacificIslander:
        demographic.nativeHawaiianOrOtherPacificIslander ? 'true' : 'false',
      white: demographic.white ? 'true' : 'false',
      demographicRaceTwoOrMoreRaces: demographic.demographicRaceTwoOrMoreRaces
        ? 'true'
        : 'false',
      hispanicOrLatinoEthnicity: demographic.hispanicOrLatinoEthnicity
        ? 'true'
        : 'false',
      countryOfBirthCode: demographic.countryOfBirthCode || '',
      stateOfBirthAbbreviation: demographic.stateOfBirthAbbreviation || '',
      cityOfBirth: demographic.cityOfBirth || '',
      publicSchoolResidenceStatus:
        demographic.publicSchoolResidenceStatus || '',
    };
  }

  /**
   * Gets CSV columns for entity type
   */
  private getEntityColumns(
    entityType: string,
  ): Array<{ key: string; header: string }> {
    const baseColumns = [
      { key: 'sourcedId', header: 'sourcedId' },
      { key: 'status', header: 'status' },
      { key: 'dateLastModified', header: 'dateLastModified' },
    ];

    const entityColumns: Record<
      string,
      Array<{ key: string; header: string }>
    > = {
      users: [
        ...baseColumns,
        { key: 'enabledUser', header: 'enabledUser' },
        { key: 'orgSourcedIds', header: 'orgSourcedIds' },
        { key: 'role', header: 'role' },
        { key: 'username', header: 'username' },
        { key: 'userIds', header: 'userIds' },
        { key: 'givenName', header: 'givenName' },
        { key: 'familyName', header: 'familyName' },
        { key: 'middleName', header: 'middleName' },
        { key: 'identifier', header: 'identifier' },
        { key: 'email', header: 'email' },
        { key: 'sms', header: 'sms' },
        { key: 'phone', header: 'phone' },
        { key: 'agentSourcedIds', header: 'agentSourcedIds' },
        { key: 'grades', header: 'grades' },
        { key: 'password', header: 'password' },
        {
          key: 'metadata.jp.kanaGivenName',
          header: 'metadata.jp.kanaGivenName',
        },
        {
          key: 'metadata.jp.kanaFamilyName',
          header: 'metadata.jp.kanaFamilyName',
        },
        { key: 'metadata.jp.homeClass', header: 'metadata.jp.homeClass' },
      ],
      orgs: [
        ...baseColumns,
        { key: 'name', header: 'name' },
        { key: 'type', header: 'type' },
        { key: 'identifier', header: 'identifier' },
        { key: 'parentSourcedId', header: 'parentSourcedId' },
        { key: 'metadata.jp.kanaName', header: 'metadata.jp.kanaName' },
        { key: 'metadata.jp.orgCode', header: 'metadata.jp.orgCode' },
      ],
      // Add other entity types similarly...
    };

    return entityColumns[entityType] || baseColumns;
  }

  /**
   * Gets repository for entity type
   */
  private getRepository(entityType: string): any {
    switch (entityType) {
      case 'users':
        return this.usersRepository;
      case 'orgs':
        return this.orgsRepository;
      case 'classes':
        return this.classesRepository;
      case 'courses':
        return this.coursesRepository;
      case 'enrollments':
        return this.enrollmentsRepository;
      case 'academicSessions':
        return this.academicSessionsRepository;
      case 'demographics':
        return this.demographicsRepository;
      default:
        return null;
    }
  }
}

/**
 * CSV Export Options
 */
export interface CsvExportOptions {
  /** Delta export: only records modified since this date */
  since?: Date;
  /** Filter by status */
  status?: string;
}

/**
 * CSV Export Result
 */
export interface CsvExportResult {
  success: boolean;
  filePath: string;
  recordCount: number;
  entityType: string;
  errorMessage?: string;
}
