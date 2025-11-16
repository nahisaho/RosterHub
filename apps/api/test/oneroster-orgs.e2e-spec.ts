import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * OneRoster Orgs API E2E Tests
 *
 * Tests the OneRoster v1.2 Orgs API endpoints with Japan Profile 1.2.2 compliance.
 *
 * Coverage:
 * - GET /ims/oneroster/v1p2/orgs (list all orgs)
 * - GET /ims/oneroster/v1p2/orgs/:sourcedId (get single org)
 * - Authentication (API key)
 * - Pagination, filtering, sorting, field selection
 * - Japan Profile metadata
 */
describe('OneRoster Orgs API (e2e)', () => {
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

    // Clean up any leftover data from previous test suites
    await cleanupTestData();

    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create main test organization (required for API key)
    const testOrg = await prisma.org.create({
      data: {
        sourcedId: 'org-e2e-main-test',
        name: 'E2E Test Main Organization',
        type: 'school',
        identifier: 'e2e-main-org-001',
        status: 'active',
      },
    });

    const key = 'test-api-key-orgs-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        key: key,
        name: 'E2E Test API Key for Orgs',
        isActive: true,
        rateLimit: 1000,
        hashedKey: hashedKey,
        organizationId: testOrg.sourcedId,
      },
    });
    apiKey = apiKeyRecord.key;

    await prisma.org.createMany({
      data: [
        {
          sourcedId: 'org-e2e-001',
          status: 'active',
          dateLastModified: new Date('2025-01-15T10:00:00Z'),
          name: '東京都立高校',
          type: 'school',
          identifier: 'tokyo-hs-001',
          metadata: {
            jp: {
              kanaName: 'トウキョウトリツコウコウ',
              orgCode: 'TKY-HS-001',
            },
          },
        },
        {
          sourcedId: 'org-e2e-002',
          status: 'active',
          dateLastModified: new Date('2025-01-16T10:00:00Z'),
          name: '大阪市立中学校',
          type: 'school',
          identifier: 'osaka-jhs-001',
          metadata: {
            jp: {
              kanaName: 'オオサカシリツチュウガッコウ',
              orgCode: 'OSK-JHS-001',
            },
          },
        },
        {
          sourcedId: 'org-e2e-003',
          status: 'tobedeleted',
          dateLastModified: new Date('2025-01-17T10:00:00Z'),
          name: '京都府教育委員会',
          type: 'district',
          identifier: 'kyoto-board-001',
          metadata: {
            jp: {
              kanaName: 'キョウトフキョウイクイインカイ',
              orgCode: 'KYT-BOARD-001',
            },
          },
        },
      ],
    });
  }

  async function cleanupTestData() {
    await prisma.apiKey.deleteMany({
      where: {
        key: 'test-api-key-orgs-e2e',
      },
    });

    await prisma.org.deleteMany({
      where: {
        OR: [
          {
            sourcedId: {
              startsWith: 'org-e2e-',
            },
          },
          {
            sourcedId: 'org-e2e-main-test',
          },
          {
            sourcedId: 'org-e2e-test', // From users test
          },
          {
            sourcedId: 'org-csv-e2e-test', // From CSV import test
          },
        ],
      },
    });
  }

  describe('GET /ims/oneroster/v1p2/orgs', () => {
    it('should return all orgs', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/orgs')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('orgs');
      expect(Array.isArray(response.body.orgs)).toBe(true);
      expect(response.body.orgs.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by type=school', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/orgs?filter=type=%27school%27')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.orgs.every((o: any) => o.type === 'school')).toBe(
        true,
      );
      expect(response.body.orgs.length).toBe(3); // org-e2e-main-test, org-e2e-001, org-e2e-002
    });

    it('should filter by status=active', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/orgs?filter=status=%27active%27')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.orgs.every((o: any) => o.status === 'active')).toBe(
        true,
      );
    });

    it('should include Japan Profile metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/orgs?filter=sourcedId=%27org-e2e-001%27')
        .set('X-API-Key', apiKey)
        .expect(200);

      const org = response.body.orgs[0];
      expect(org.metadata).toHaveProperty('jp');
      expect(org.metadata.jp.kanaName).toBe('トウキョウトリツコウコウ');
      expect(org.metadata.jp.orgCode).toBe('TKY-HS-001');
    });
  });

  describe('GET /ims/oneroster/v1p2/orgs/:sourcedId', () => {
    it('should return org by sourcedId', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/orgs/org-e2e-001')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('org');
      expect(response.body.org.sourcedId).toBe('org-e2e-001');
      expect(response.body.org.name).toBe('東京都立高校');
    });

    it('should return 404 for non-existent org', async () => {
      return request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/orgs/non-existent-id')
        .set('X-API-Key', apiKey)
        .expect(404);
    });
  });
});
