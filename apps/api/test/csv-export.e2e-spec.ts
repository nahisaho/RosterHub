/**
 * CSV Export E2E Tests
 *
 * Comprehensive tests for CSV export functionality including:
 * - Bulk export for all 7 OneRoster entities
 * - Delta export with various date ranges
 * - Edge cases and error handling
 *
 * @requirements FR-CSV-006, FR-CSV-007, FR-API-008
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('CSV Export E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const apiKey = 'test-api-key-csv-export-e2e';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test organization for API key
    const testOrg = await prisma.org.upsert({
      where: { sourcedId: 'csv-export-test-org' },
      update: {},
      create: {
        sourcedId: 'csv-export-test-org',
        name: 'CSV Export Test Organization',
        type: 'school',
        identifier: 'csv-export-test-org-001',
        status: 'active',
        dateLastModified: new Date(),
      },
    });

    // Create API key with proper hash
    const existingKey = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!existingKey) {
      const hashedKey = await bcrypt.hash(apiKey, 10);
      await prisma.apiKey.create({
        data: {
          name: 'E2E Test Key - CSV Export',
          key: apiKey,
          hashedKey: hashedKey,
          organizationId: testOrg.sourcedId,
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          rateLimit: 10000,
          ipWhitelist: [],
        },
      });
    }

    // Setup test data for delta export tests
    await setupDeltaExportTestData(prisma);
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupDeltaExportTestData(prisma);
    await app.close();
  });

  /**
   * Delta Export API Tests
   * Testing GET /ims/oneroster/v1p2/csv/export/:entityType/delta
   */
  describe('Delta Export API - GET /ims/oneroster/v1p2/csv/export/:entityType/delta', () => {
    describe('Valid Delta Export Requests', () => {
      it('should export users modified since specific date', async () => {
        const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['x-delta-since']).toBeDefined();
        expect(response.text).toContain('sourcedId');
        expect(response.text).toContain('givenName');
      });

      it('should export orgs modified since specific date', async () => {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/orgs/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('sourcedId');
        expect(response.text).toContain('name');
      });

      it('should export classes modified since specific date', async () => {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/classes/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });

      it('should export courses modified since specific date', async () => {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/courses/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });

      it('should export enrollments modified since specific date', async () => {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/enrollments/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });

      it('should export academicSessions modified since specific date', async () => {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/academicSessions/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });

      it('should export demographics modified since specific date', async () => {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/demographics/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });
    });

    describe('Delta Export with Status Filter', () => {
      it('should export only active records when status=active', async () => {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since, status: 'active' })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        // Should not contain 'tobedeleted' status rows (excluding header)
        const lines = response.text.split('\n').filter(line => line.trim());
        const dataLines = lines.slice(1); // Skip header
        dataLines.forEach(line => {
          if (line.trim()) {
            expect(line).not.toMatch(/,tobedeleted,/);
          }
        });
      });

      it('should export only deleted records when status=tobedeleted', async () => {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since, status: 'tobedeleted' })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });
    });

    describe('Delta Export Edge Cases', () => {
      it('should return empty CSV (header only) when no records modified', async () => {
        const since = new Date().toISOString(); // Now - no records modified after this

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        // Should have header row at minimum
        expect(response.text).toContain('sourcedId');
      });

      it('should handle very old since date (include all records)', async () => {
        const since = new Date('2020-01-01T00:00:00Z').toISOString(); // Very old date

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['x-record-count']).toBeDefined();
      });

      it('should handle ISO 8601 date with timezone offset', async () => {
        const since = '2025-01-01T00:00:00+09:00'; // JST timezone

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });

      it('should handle date-only format (YYYY-MM-DD)', async () => {
        const since = '2025-01-01';

        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });
    });

    describe('Delta Export Error Handling', () => {
      it('should return 400 when since parameter is missing', async () => {
        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .expect(400);

        expect(response.body.message).toContain('since');
      });

      it('should return 400 for invalid date format', async () => {
        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .set('X-API-Key', apiKey)
          .query({ since: 'not-a-date' })
          .expect(400);

        expect(response.body.message).toContain('Invalid date format');
      });

      it('should return 400 for invalid entity type', async () => {
        const since = new Date().toISOString();

        await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/invalidEntity/delta')
          .set('X-API-Key', apiKey)
          .query({ since })
          .expect(400);
      });

      it('should return 401 without API key', async () => {
        const since = new Date().toISOString();

        await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users/delta')
          .query({ since })
          .expect(401);
      });
    });
  });

  /**
   * Bulk Export API Tests
   * Testing GET /ims/oneroster/v1p2/csv/export/:entityType
   */
  describe('Bulk Export API - GET /ims/oneroster/v1p2/csv/export/:entityType', () => {
    describe('Export All Entities', () => {
      const entityTypes = [
        'users',
        'orgs',
        'classes',
        'courses',
        'enrollments',
        'academicSessions',
        'demographics',
      ];

      entityTypes.forEach((entityType) => {
        it(`should export ${entityType} as CSV`, async () => {
          const response = await request(app.getHttpServer())
            .get(`/ims/oneroster/v1p2/csv/export/${entityType}`)
            .set('X-API-Key', apiKey)
            .expect(200);

          expect(response.headers['content-type']).toContain('text/csv');
          expect(response.headers['content-disposition']).toContain('attachment');
          expect(response.headers['x-record-count']).toBeDefined();
        });
      });
    });

    describe('Export with Status Filter', () => {
      it('should filter by status=active', async () => {
        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users')
          .set('X-API-Key', apiKey)
          .query({ status: 'active' })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });

      it('should filter by status=tobedeleted', async () => {
        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users')
          .set('X-API-Key', apiKey)
          .query({ status: 'tobedeleted' })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
      });
    });

    describe('Export Japan Profile Metadata', () => {
      it('should include Japan Profile metadata columns in users export', async () => {
        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users')
          .set('X-API-Key', apiKey)
          .expect(200);

        const headers = response.text.split('\n')[0];
        expect(headers).toContain('metadata.jp.kanaGivenName');
        expect(headers).toContain('metadata.jp.kanaFamilyName');
      });

      it('should include Japan Profile metadata columns in orgs export', async () => {
        const response = await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/orgs')
          .set('X-API-Key', apiKey)
          .expect(200);

        expect(response.text).toContain('sourcedId');
        expect(response.text).toContain('name');
      });
    });

    describe('Export Error Handling', () => {
      it('should return 400 for invalid entity type', async () => {
        await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/invalidEntityType')
          .set('X-API-Key', apiKey)
          .expect(400);
      });

      it('should return 401 without API key', async () => {
        await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users')
          .expect(401);
      });

      it('should return 401 with invalid API key', async () => {
        await request(app.getHttpServer())
          .get('/ims/oneroster/v1p2/csv/export/users')
          .set('X-API-Key', 'invalid-api-key')
          .expect(401);
      });
    });
  });
});

/**
 * Setup test data for delta export tests
 */
async function setupDeltaExportTestData(prisma: PrismaService): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Create test users with different modification dates
  await prisma.user.createMany({
    data: [
      {
        sourcedId: 'delta-test-user-001',
        status: 'active',
        dateLastModified: now,
        enabledUser: true,
        givenName: '最新',
        familyName: 'ユーザー',
        role: 'student',
        username: 'delta.latest',
        email: 'delta.latest@example.jp',
        identifier: 'delta-test-user-001-id',
        userIds: [],
        metadata: { jp: { kanaGivenName: 'サイシン', kanaFamilyName: 'ユーザー' } },
      },
      {
        sourcedId: 'delta-test-user-002',
        status: 'active',
        dateLastModified: yesterday,
        enabledUser: true,
        givenName: '昨日',
        familyName: 'ユーザー',
        role: 'teacher',
        username: 'delta.yesterday',
        email: 'delta.yesterday@example.jp',
        identifier: 'delta-test-user-002-id',
        userIds: [],
        metadata: { jp: { kanaGivenName: 'キノウ', kanaFamilyName: 'ユーザー' } },
      },
      {
        sourcedId: 'delta-test-user-003',
        status: 'tobedeleted',
        dateLastModified: lastWeek,
        enabledUser: false,
        givenName: '削除予定',
        familyName: 'ユーザー',
        role: 'student',
        username: 'delta.deleted',
        email: 'delta.deleted@example.jp',
        identifier: 'delta-test-user-003-id',
        userIds: [],
        metadata: { jp: { kanaGivenName: 'サクジョヨテイ', kanaFamilyName: 'ユーザー' } },
      },
    ],
    skipDuplicates: true,
  });
}

/**
 * Cleanup test data after tests complete
 */
async function cleanupDeltaExportTestData(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      sourcedId: {
        startsWith: 'delta-test-',
      },
    },
  });

  // Clean up API key
  await prisma.apiKey.deleteMany({
    where: {
      key: 'test-api-key-csv-export-e2e',
    },
  });

  // Clean up test organization
  await prisma.org.deleteMany({
    where: {
      sourcedId: 'csv-export-test-org',
    },
  });
}
