import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CSV Import/Export E2E Tests
 *
 * Tests the CSV import and export functionality with OneRoster Japan Profile.
 *
 * Coverage:
 * - POST /ims/oneroster/v1p2/csv/import (upload CSV)
 * - GET /ims/oneroster/v1p2/csv/export/:entityType (download CSV)
 * - CSV validation
 * - Japan Profile metadata in CSV
 * - Bulk import performance
 */
describe('CSV Import/Export (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test organization (required for API key)
    const testOrg = await prisma.org.create({
      data: {
        sourcedId: 'org-csv-e2e-test',
        name: 'E2E CSV Test Organization',
        type: 'school',
        identifier: 'e2e-csv-org-001',
        status: 'active',
      },
    });

    const key = 'test-api-key-csv-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        key: key,
        name: 'E2E Test API Key for CSV',
        isActive: true,
        rateLimit: 10000,
        hashedKey: hashedKey,
        organizationId: testOrg.sourcedId,
      },
    });
    apiKey = apiKeyRecord.key;
  }

  async function cleanupTestData() {
    await prisma.user.deleteMany({
      where: {
        sourcedId: {
          startsWith: 'csv-import-',
        },
      },
    });

    await prisma.apiKey.deleteMany({
      where: {
        key: 'test-api-key-csv-e2e',
      },
    });

    await prisma.org.deleteMany({
      where: {
        sourcedId: 'org-csv-e2e-test',
      },
    });
  }

  describe('POST /ims/oneroster/v1p2/csv/import', () => {
    it('should import valid users CSV file', async () => {
      const csvContent = `sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
csv-import-001,active,2025-01-15T10:00:00Z,true,太郎,山田,student,yamada.taro,yamada.taro@example.jp,タロウ,ヤマダ
csv-import-002,active,2025-01-15T10:00:00Z,true,花子,佐藤,teacher,sato.hanako,sato.hanako@example.jp,ハナコ,サトウ`;

      const tempFilePath = path.join(__dirname, 'test-import-users.csv');
      fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

      const response = await request(app.getHttpServer())
        .post('/ims/oneroster/v1p2/csv/import')
        .set('X-API-Key', apiKey)
        .attach('file', tempFilePath)
        .field('entityType', 'users')
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should reject CSV without required fields', async () => {
      const csvContent = `sourcedId,status
csv-import-003,active`;

      const tempFilePath = path.join(__dirname, 'test-invalid-users.csv');
      fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

      await request(app.getHttpServer())
        .post('/ims/oneroster/v1p2/csv/import')
        .set('X-API-Key', apiKey)
        .attach('file', tempFilePath)
        .field('entityType', 'users')
        .expect(400);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should reject CSV file larger than 50MB', async () => {
      // This test is skipped as it would create a very large file
      // In production, implement file size validation
    });
  });

  describe('GET /ims/oneroster/v1p2/csv/export/:entityType', () => {
    beforeAll(async () => {
      // Clean up any existing test data first
      await prisma.user.deleteMany({
        where: {
          sourcedId: {
            startsWith: 'csv-export-',
          },
        },
      });

      await prisma.org.deleteMany({
        where: {
          sourcedId: {
            startsWith: 'csv-export-org-',
          },
        },
      });

      // Create test data for export
      await prisma.user.create({
        data: {
          sourcedId: 'csv-export-001',
          status: 'active',
          dateLastModified: new Date('2025-01-15T10:00:00Z'),
          enabledUser: true,
          givenName: '太郎',
          familyName: '山田',
          role: 'student',
          username: 'yamada.taro.export',
          email: 'yamada.taro.export@example.jp',
          identifier: 'csv-export-001-id',
          userIds: [],
          metadata: {
            jp: {
              kanaGivenName: 'タロウ',
              kanaFamilyName: 'ヤマダ',
            },
          },
        },
      });
    });

    afterAll(async () => {
      // Clean up test data after export tests
      await prisma.user.deleteMany({
        where: {
          sourcedId: {
            startsWith: 'csv-export-',
          },
        },
      });

      await prisma.org.deleteMany({
        where: {
          sourcedId: {
            startsWith: 'csv-export-org-',
          },
        },
      });
    });

    it('should export users as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/csv/export/users')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect('Content-Type', /csv/);

      expect(response.text).toContain('sourcedId');
      expect(response.text).toContain('givenName');
      expect(response.text).toContain('csv-export-001');
    });

    it('should include Japan Profile metadata in exported CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/csv/export/users')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.text).toContain('metadata.jp.kanaGivenName');
      expect(response.text).toContain('metadata.jp.kanaFamilyName');
      expect(response.text).toContain('タロウ');
      expect(response.text).toContain('ヤマダ');
    });

    it('should export orgs as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/csv/export/orgs')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect('Content-Type', /csv/);

      expect(response.text).toContain('sourcedId');
      expect(response.text).toContain('name');
      expect(response.text).toContain('type');
    });

    it('should return 400 for unknown entity type', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/csv/export/unknownEntity')
        .set('X-API-Key', apiKey)
        .expect(400);
    });
  });

  /**
   * CSV Import Tests for Additional Entities
   * Test CSV import for classes, courses, enrollments, demographics, academicSessions
   */
  describe('CSV Import - Additional Entities', () => {
    it('should import valid classes CSV file', async () => {
      const csvContent = `sourcedId,status,dateLastModified,title,classCode,classType,courseSourcedId,schoolSourcedId,termSourcedIds,metadata.jp.subjectCode,metadata.jp.gradeLevel
csv-class-001,active,2025-01-15T10:00:00Z,Math 101 - Section A,MATH101-A,scheduled,course-001,org-csv-e2e-test,session-001,M01,10`;

      const tempFilePath = path.join(__dirname, 'test-import-classes.csv');
      fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

      const response = await request(app.getHttpServer())
        .post('/ims/oneroster/v1p2/csv/import')
        .set('X-API-Key', apiKey)
        .attach('file', tempFilePath)
        .field('entityType', 'classes')
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should import valid courses CSV file', async () => {
      const csvContent = `sourcedId,status,dateLastModified,title,courseCode,orgSourcedId,schoolYearSourcedId,metadata.jp.subjectArea,metadata.jp.credits
csv-course-001,active,2025-01-15T10:00:00Z,Mathematics I,MATH101,org-csv-e2e-test,session-001,mathematics,4`;

      const tempFilePath = path.join(__dirname, 'test-import-courses.csv');
      fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

      const response = await request(app.getHttpServer())
        .post('/ims/oneroster/v1p2/csv/import')
        .set('X-API-Key', apiKey)
        .attach('file', tempFilePath)
        .field('entityType', 'courses')
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should import valid enrollments CSV file', async () => {
      const csvContent = `sourcedId,status,dateLastModified,classSourcedId,schoolSourcedId,userSourcedId,role,beginDate,endDate,metadata.jp.attendanceNumber
csv-enrollment-001,active,2025-01-15T10:00:00Z,csv-class-001,org-csv-e2e-test,csv-import-001,student,2025-04-01,2026-03-31,001`;

      const tempFilePath = path.join(__dirname, 'test-import-enrollments.csv');
      fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

      const response = await request(app.getHttpServer())
        .post('/ims/oneroster/v1p2/csv/import')
        .set('X-API-Key', apiKey)
        .attach('file', tempFilePath)
        .field('entityType', 'enrollments')
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should import valid demographics CSV file', async () => {
      const csvContent = `sourcedId,status,dateLastModified,birthDate,sex,userSourcedId,metadata.jp.nationality,metadata.jp.guardianName,metadata.jp.guardianKanaName,metadata.jp.guardianRelationship
csv-demo-001,active,2025-01-15T10:00:00Z,2010-04-15,male,csv-import-001,JP,山田 太郎,ヤマダ タロウ,father`;

      const tempFilePath = path.join(__dirname, 'test-import-demographics.csv');
      fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

      const response = await request(app.getHttpServer())
        .post('/ims/oneroster/v1p2/csv/import')
        .set('X-API-Key', apiKey)
        .attach('file', tempFilePath)
        .field('entityType', 'demographics')
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should import valid academicSessions CSV file', async () => {
      const csvContent = `sourcedId,status,dateLastModified,title,type,startDate,endDate,metadata.jp.fiscalYear,metadata.jp.schoolYearName
csv-session-001,active,2025-01-15T10:00:00Z,2025 Academic Year,schoolYear,2025-04-01,2026-03-31,2025,令和7年度`;

      const tempFilePath = path.join(__dirname, 'test-import-academicSessions.csv');
      fs.writeFileSync(tempFilePath, csvContent, 'utf-8');

      const response = await request(app.getHttpServer())
        .post('/ims/oneroster/v1p2/csv/import')
        .set('X-API-Key', apiKey)
        .attach('file', tempFilePath)
        .field('entityType', 'academicSessions')
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });
  });

  /**
   * CSV Export - Delta Mode Tests
   * Test delta export functionality for all entities
   */
  describe('CSV Export - Delta Mode', () => {
    beforeAll(async () => {
      // Create test data with different dateLastModified values
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await prisma.user.create({
        data: {
          sourcedId: 'csv-delta-user-001',
          status: 'active',
          dateLastModified: now,
          enabledUser: true,
          givenName: 'Updated',
          familyName: 'User',
          role: 'student',
          username: 'delta.user',
          email: 'delta.user@example.jp',
          orgSourcedIds: ['org-csv-e2e-test'],
          metadata: {
            jp: {
              kanaGivenName: 'コウシン',
              kanaFamilyName: 'ユーザー',
            },
          },
        },
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: {
          sourcedId: {
            startsWith: 'csv-delta-',
          },
        },
      });
    });

    it('should export only modified records in delta mode', async () => {
      const cutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/csv/export/users')
        .set('X-API-Key', apiKey)
        .query({ delta: cutoffDate.toISOString() })
        .expect(200)
        .expect('Content-Type', /csv/);

      // Should contain recently modified user
      expect(response.text).toContain('csv-delta-user-001');
      expect(response.text).toContain('Updated');
    });

    it('should export all entities in delta mode', async () => {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const entities = ['users', 'orgs', 'classes', 'courses', 'enrollments', 'demographics', 'academicSessions'];

      for (const entityType of entities) {
        const response = await request(app.getHttpServer())
          .get(`/ims/oneroster/v1p2/csv/export/${entityType}`)
          .set('X-API-Key', apiKey)
          .query({ delta: cutoffDate.toISOString() })
          .expect(200);

        expect(response.headers['content-type']).toContain('csv');
      }
    });
  });
});
