import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * OneRoster Demographics API E2E Tests
 *
 * Tests the OneRoster v1.2 Demographics API endpoints with Japan Profile 1.2.2 compliance.
 *
 * Coverage:
 * - GET /ims/oneroster/v1p2/demographics/:sourcedId (get single demographic)
 * - GET /ims/oneroster/v1p2/demographics (list with filtering)
 * - PUT /ims/oneroster/v1p2/demographics/:sourcedId (update demographic)
 * - Authentication (API key)
 * - Filtering (birthDate, sex, status)
 * - Field selection (fields parameter)
 * - Japan Profile metadata (kana fields validation)
 *
 * Note: Demographics is a read-only resource in OneRoster spec
 */
describe('OneRoster Demographics API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let apiKey: string;
  let testOrgId: string;
  let testUserId: string;
  let testDemographicId: string;

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
    // Create test organization
    const testOrg = await prisma.org.create({
      data: {
        sourcedId: 'org-demographics-e2e',
        name: 'Demographics E2E Test School',
        type: 'school',
        identifier: 'demographics-e2e-001',
      },
    });
    testOrgId = testOrg.sourcedId;

    // Create test API key
    const key = 'test-api-key-demographics-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    await prisma.apiKey.create({
      data: {
        key: key,
        hashedKey: hashedKey,
        name: 'Demographics E2E Test Key',
        organizationId: testOrgId,
      },
    });

    apiKey = key;

    // Create test users (demographics are linked to users)
    const user1 = await prisma.user.create({
      data: {
        sourcedId: 'user-demo-001',
        enabledUser: true,
        username: 'demo_student1',
        givenName: 'Taro',
        familyName: 'Tanaka',
        role: 'student',
        email: 'demo_student1@example.jp',
        identifier: 'user-demo-001-id',
        userIds: [],
        metadata: {
          jp: {
            kanaGivenName: 'タロウ',
            kanaFamilyName: 'タナカ',
          },
        },
      },
    });

    testUserId = user1.sourcedId;

    // Create user2
    await prisma.user.create({
      data: {
        sourcedId: 'user-demo-002',
        enabledUser: true,
        username: 'demo_student2',
        givenName: 'Hanako',
        familyName: 'Suzuki',
        role: 'student',
        email: 'demo_student2@example.jp',
        identifier: 'user-demo-002-id',
        userIds: [],
        metadata: {
          jp: {
            kanaGivenName: 'ハナコ',
            kanaFamilyName: 'スズキ',
          },
        },
      },
    });

    // Create user3 for tobedeleted demographic
    await prisma.user.create({
      data: {
        sourcedId: 'user-demo-003',
        enabledUser: true,
        username: 'demo_student3',
        givenName: 'Jiro',
        familyName: 'Yamada',
        role: 'student',
        email: 'demo_student3@example.jp',
        identifier: 'user-demo-003-id',
        userIds: [],
      },
    });

    // Create test demographics
    const demographic1 = await prisma.demographic.create({
      data: {
        sourcedId: 'demographic-e2e-001',
        birthDate: new Date('2010-04-15'),
        sex: 'male',
        userSourcedId: user1.sourcedId,
        metadata: {
          jp: {
            nationality: 'JP',
            guardianName: '田中 太郎',
            guardianKanaName: 'タナカ タロウ',
            guardianRelationship: 'father',
          },
        },
      },
    });

    testDemographicId = demographic1.sourcedId;

    await prisma.demographic.createMany({
      data: [
        {
          sourcedId: 'demographic-e2e-002',
          birthDate: new Date('2011-06-20'),
          sex: 'female',
          userSourcedId: 'user-demo-002',
          metadata: {
            jp: {
              nationality: 'JP',
              guardianName: '鈴木 花子',
              guardianKanaName: 'スズキ ハナコ',
              guardianRelationship: 'mother',
            },
          },
        },
        {
          sourcedId: 'demographic-e2e-003',
          birthDate: new Date('2010-12-01'),
          sex: 'other',
          status: 'tobedeleted',
          userSourcedId: 'user-demo-003',
        },
      ],
    });
  }

  /**
   * Cleanup test data from database
   */
  async function cleanupTestData() {
    await prisma.demographic.deleteMany({
      where: { sourcedId: { startsWith: 'demographic-e2e-' } },
    });
    await prisma.user.deleteMany({
      where: { sourcedId: { startsWith: 'user-demo-' } },
    });
    await prisma.apiKey.deleteMany({
      where: { key: { startsWith: 'test-api-key-demographics-e2e' } },
    });
    await prisma.org.deleteMany({
      where: { sourcedId: { startsWith: 'org-demographics-e2e' } },
    });
  }

  /**
   * Test: GET /ims/oneroster/v1p2/demographics/:sourcedId
   * Should return single demographic by sourcedId
   */
  describe('GET /ims/oneroster/v1p2/demographics/:sourcedId', () => {
    it('should return single demographic', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/demographics/${testDemographicId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object, not wrapped
      expect(response.body.sourcedId).toBe(testDemographicId);
      expect(response.body.sex).toBe('male');
      expect(response.body).toHaveProperty('birthDate');
      expect(response.body.metadata).toHaveProperty('jp');
    });

    it('should return 404 for non-existent demographic', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/demographics/non-existent-id')
        .set('X-API-Key', apiKey)
        .expect(404);
    });

    it('should return 401 without API key', async () => {
      await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/demographics/${testDemographicId}`)
        .expect(401);
    });
  });

  /**
   * Test: GET /ims/oneroster/v1p2/demographics
   * Should return list of demographics with filtering
   */
  describe('GET /ims/oneroster/v1p2/demographics', () => {
    it('should return list of demographics', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/demographics')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('demographics');
      expect(Array.isArray(response.body.demographics)).toBe(true);

      // Verify demographic structure
      const firstDemo = response.body.demographics[0];
      expect(firstDemo).toHaveProperty('sourcedId');
      expect(firstDemo).toHaveProperty('birthDate');
      expect(firstDemo).toHaveProperty('sex');
      expect(firstDemo).toHaveProperty('status');
    });
  });

  /**
   * Test: Filtering
   * Should filter demographics by sex, status, birthDate
   */
  describe('Filtering', () => {
    it('should filter demographics by sex', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/demographics')
        .set('X-API-Key', apiKey)
        .query({ filter: "sex='male'" })
        .expect(200);

      expect(response.body.demographics.length).toBeGreaterThan(0);
      response.body.demographics.forEach((demo: any) => {
        expect(demo.sex).toBe('male');
      });
    });

    it('should filter demographics by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/demographics')
        .set('X-API-Key', apiKey)
        .query({ filter: "status='active'" })
        .expect(200);

      expect(response.body.demographics.length).toBeGreaterThan(0);
      response.body.demographics.forEach((demo: any) => {
        expect(demo.status).toBe('active');
      });
    });

    it('should filter demographics by birthDate range', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/demographics')
        .set('X-API-Key', apiKey)
        .query({ filter: "birthDate>='2010-01-01' AND birthDate<='2010-12-31'" })
        .expect(200);

      expect(response.body.demographics.length).toBeGreaterThan(0);
      response.body.demographics.forEach((demo: any) => {
        const birthDate = new Date(demo.birthDate);
        expect(birthDate >= new Date('2010-01-01')).toBe(true);
        expect(birthDate <= new Date('2010-12-31')).toBe(true);
      });
    });
  });

  /**
   * Test: Field Selection
   * Should return only requested fields
   * TODO: Implement field selection feature
   */
  describe('Field Selection', () => {
    it('should return only requested fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/demographics')
        .set('X-API-Key', apiKey)
        .query({ fields: 'sourcedId,birthDate,sex' })
        .expect(200);

      const firstDemo = response.body.demographics[0];
      expect(firstDemo).toHaveProperty('sourcedId');
      expect(firstDemo).toHaveProperty('birthDate');
      expect(firstDemo).toHaveProperty('sex');

      // These fields should not be present
      expect(firstDemo).not.toHaveProperty('dateLastModified');
      expect(firstDemo).not.toHaveProperty('metadata');
    });
  });

  /**
   * Test: PUT /ims/oneroster/v1p2/demographics/:sourcedId
   * Update demographic record
   */
  describe('PUT /ims/oneroster/v1p2/demographics/:sourcedId', () => {
    it('should update a demographic record', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ims/oneroster/v1p2/demographics/${testDemographicId}`)
        .set('X-API-Key', apiKey)
        .send({
          sex: 'female',
        })
        .expect(200);

      expect(response.body.demographic).toBeDefined();
      expect(response.body.demographic.sex).toBe('female');
    });

    it('should return 404 for non-existent demographic', async () => {
      await request(app.getHttpServer())
        .put('/ims/oneroster/v1p2/demographics/non-existent-id')
        .set('X-API-Key', apiKey)
        .send({
          sex: 'male',
        })
        .expect(404);
    });
  });

  /**
   * Test: Japan Profile Metadata
   * Should validate and return Japan Profile specific fields
   */
  describe('Japan Profile Metadata', () => {
    it('should return Japan Profile metadata with kana fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/demographics/${testDemographicId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object
      expect(response.body.metadata).toHaveProperty('jp');
      const jpMetadata = response.body.metadata.jp;

      expect(jpMetadata).toHaveProperty('nationality');
      expect(jpMetadata).toHaveProperty('guardianName');
      expect(jpMetadata).toHaveProperty('guardianKanaName');
      expect(jpMetadata).toHaveProperty('guardianRelationship');

      expect(jpMetadata.nationality).toBe('JP');
      expect(jpMetadata.guardianName).toBe('田中 太郎');
      expect(jpMetadata.guardianKanaName).toBe('タナカ タロウ');
      expect(jpMetadata.guardianRelationship).toBe('father');
    });

    it('should validate kana format in guardian name', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/demographics/${testDemographicId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object
      const kanaName = response.body.metadata.jp.guardianKanaName;

      // Verify kana characters (Katakana range)
      const kanaRegex = /^[\u30A0-\u30FF\s]+$/;
      expect(kanaRegex.test(kanaName)).toBe(true);
    });
  });

  /**
   * Test: User Association
   * Should correctly associate demographic with user
   */
  describe('User Association', () => {
    it('should return associated user information', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/demographics/${testDemographicId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns userSourcedId reference (not nested user object)
      expect(response.body).toHaveProperty('userSourcedId');
      expect(response.body.userSourcedId).toBe(testUserId);
    });
  });
});
