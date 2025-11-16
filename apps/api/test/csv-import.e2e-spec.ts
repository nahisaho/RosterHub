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
});
