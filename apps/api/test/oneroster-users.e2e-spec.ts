import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * OneRoster Users API E2E Tests
 *
 * Tests the OneRoster v1.2 Users API endpoints with Japan Profile 1.2.2 compliance.
 *
 * Coverage:
 * - GET /ims/oneroster/v1p2/users (list all users)
 * - GET /ims/oneroster/v1p2/users/:sourcedId (get single user)
 * - Authentication (API key)
 * - Pagination (limit, offset)
 * - Filtering (role, status, dateLastModified)
 * - Sorting (field, -field)
 * - Field selection (fields parameter)
 * - Delta/Incremental API
 * - Japan Profile metadata
 */
describe('OneRoster Users API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  /**
   * Setup test data in database
   */
  async function setupTestData() {
    // Create test organization (required for API key)
    const testOrg = await prisma.org.create({
      data: {
        sourcedId: 'org-e2e-test',
        name: 'E2E Test Organization',
        type: 'school',
        identifier: 'e2e-test-org-001',
        status: 'active',
      },
    });

    // Create test API key
    const key = 'test-api-key-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        key: key,
        name: 'E2E Test API Key',
        isActive: true,
        rateLimit: 1000,
        hashedKey: hashedKey,
        organizationId: testOrg.sourcedId,
      },
    });
    apiKey = apiKeyRecord.key;

    // Create test users
    await prisma.user.createMany({
      data: [
        {
          sourcedId: 'user-e2e-001',
          status: 'active',
          dateLastModified: new Date('2025-01-15T10:00:00Z'),
          enabledUser: true,
          givenName: '太郎',
          familyName: '山田',
          role: 'student',
          username: 'yamada.taro',
          email: 'yamada.taro@example.jp',
          identifier: 'user-e2e-001-id',
          userIds: [],
          metadata: {
            jp: {
              kanaGivenName: 'タロウ',
              kanaFamilyName: 'ヤマダ',
            },
          },
        },
        {
          sourcedId: 'user-e2e-002',
          status: 'active',
          dateLastModified: new Date('2025-01-16T10:00:00Z'),
          enabledUser: true,
          givenName: '花子',
          familyName: '佐藤',
          role: 'teacher',
          username: 'sato.hanako',
          email: 'sato.hanako@example.jp',
          identifier: 'user-e2e-002-id',
          userIds: [],
          metadata: {
            jp: {
              kanaGivenName: 'ハナコ',
              kanaFamilyName: 'サトウ',
            },
          },
        },
        {
          sourcedId: 'user-e2e-003',
          status: 'tobedeleted',
          dateLastModified: new Date('2025-01-17T10:00:00Z'),
          enabledUser: false,
          givenName: '次郎',
          familyName: '田中',
          role: 'student',
          username: 'tanaka.jiro',
          email: 'tanaka.jiro@example.jp',
          identifier: 'user-e2e-003-id',
          userIds: [],
          metadata: {
            jp: {
              kanaGivenName: 'ジロウ',
              kanaFamilyName: 'タナカ',
            },
          },
        },
      ],
    });
  }

  /**
   * Cleanup test data from database
   */
  async function cleanupTestData() {
    await prisma.user.deleteMany({
      where: {
        sourcedId: {
          startsWith: 'user-e2e-',
        },
      },
    });

    await prisma.apiKey.deleteMany({
      where: {
        key: 'test-api-key-e2e',
      },
    });

    await prisma.org.deleteMany({
      where: {
        sourcedId: 'org-e2e-test',
      },
    });
  }

  describe('Authentication', () => {
    it('should reject request without API key', () => {
      return request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users')
        .expect(401);
    });

    it('should reject request with invalid API key', () => {
      return request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users')
        .set('X-API-Key', 'invalid-key')
        .expect(401);
    });

    it('should accept request with valid API key', () => {
      return request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users')
        .set('X-API-Key', apiKey)
        .expect(200);
    });
  });

  describe('GET /ims/oneroster/v1p2/users', () => {
    it('should return all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination with limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?limit=2')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.users.length).toBeLessThanOrEqual(2);
    });

    it('should support pagination with offset', async () => {
      const firstPage = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?limit=1&offset=0')
        .set('X-API-Key', apiKey)
        .expect(200);

      const secondPage = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?limit=1&offset=1')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(firstPage.body.users[0].sourcedId).not.toBe(
        secondPage.body.users[0].sourcedId,
      );
    });

    it('should filter by role=student', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?filter=role=%27student%27')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.users.every((u: any) => u.role === 'student')).toBe(
        true,
      );
    });

    it('should filter by status=active', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?filter=status=%27active%27')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.users.every((u: any) => u.status === 'active')).toBe(
        true,
      );
    });

    it('should support Delta API (dateLastModified filter)', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/ims/oneroster/v1p2/users?filter=dateLastModified>=%272025-01-16T00:00:00Z%27',
        )
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.users.length).toBeGreaterThanOrEqual(2);
      expect(
        response.body.users.every(
          (u: any) => new Date(u.dateLastModified) >= new Date('2025-01-16'),
        ),
      ).toBe(true);
    });

    it('should support complex filters with AND', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/ims/oneroster/v1p2/users?filter=role=%27student%27%20AND%20status=%27active%27',
        )
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(
        response.body.users.every(
          (u: any) => u.role === 'student' && u.status === 'active',
        ),
      ).toBe(true);
    });

    it('should support sorting by givenName ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?sort=givenName')
        .set('X-API-Key', apiKey)
        .expect(200);

      const givenNames = response.body.users.map((u: any) => u.givenName);
      const sortedNames = [...givenNames].sort();
      expect(givenNames).toEqual(sortedNames);
    });

    it('should support sorting by dateLastModified descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?sort=-dateLastModified')
        .set('X-API-Key', apiKey)
        .expect(200);

      const dates = response.body.users.map((u: any) =>
        new Date(u.dateLastModified).getTime(),
      );
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });

    it('should support field selection', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?fields=sourcedId,givenName,email')
        .set('X-API-Key', apiKey)
        .expect(200);

      const firstUser = response.body.users[0];
      expect(firstUser).toHaveProperty('sourcedId');
      expect(firstUser).toHaveProperty('givenName');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).not.toHaveProperty('familyName');
      expect(firstUser).not.toHaveProperty('username');
    });

    it('should include Japan Profile metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users?filter=sourcedId=%27user-e2e-001%27')
        .set('X-API-Key', apiKey)
        .expect(200);

      const user = response.body.users[0];
      expect(user.metadata).toHaveProperty('jp');
      expect(user.metadata.jp).toHaveProperty('kanaGivenName');
      expect(user.metadata.jp).toHaveProperty('kanaFamilyName');
      expect(user.metadata.jp.kanaGivenName).toBe('タロウ');
      expect(user.metadata.jp.kanaFamilyName).toBe('ヤマダ');
    });
  });

  describe('GET /ims/oneroster/v1p2/users/:sourcedId', () => {
    it('should return user by sourcedId', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users/user-e2e-001')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.sourcedId).toBe('user-e2e-001');
      expect(response.body.user.givenName).toBe('太郎');
      expect(response.body.user.familyName).toBe('山田');
    });

    it('should return 404 for non-existent user', async () => {
      return request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users/non-existent-id')
        .set('X-API-Key', apiKey)
        .expect(404);
    });

    it('should include Japan Profile metadata in single user', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users/user-e2e-002')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.user.metadata.jp.kanaGivenName).toBe('ハナコ');
      expect(response.body.user.metadata.jp.kanaFamilyName).toBe('サトウ');
    });

    it('should support field selection for single user', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users/user-e2e-001?fields=sourcedId,email')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.user).toHaveProperty('sourcedId');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('givenName');
    });
  });

  describe('Response Headers', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/users')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });
});
