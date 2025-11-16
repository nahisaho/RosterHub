import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * OneRoster Academic Sessions API E2E Tests
 *
 * Tests the OneRoster v1.2 Academic Sessions API endpoints with Japan Profile 1.2.2 compliance.
 *
 * Coverage:
 * - GET /ims/oneroster/v1p2/academicSessions (list all academic sessions)
 * - GET /ims/oneroster/v1p2/academicSessions/:sourcedId (get single session)
 * - PUT /ims/oneroster/v1p2/academicSessions/:sourcedId (update session)
 * - DELETE /ims/oneroster/v1p2/academicSessions/:sourcedId (soft delete)
 * - Authentication (API key)
 * - Pagination (limit, offset)
 * - Filtering (type, startDate, endDate, status)
 * - Sorting (field, -field)
 * - Field selection (fields parameter)
 * - Hierarchical structure (parent/children sessions)
 * - Japan Profile metadata
 */
describe('OneRoster Academic Sessions API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let apiKey: string;
  let testOrgId: string;
  let testSessionId: string;
  let parentSessionId: string;

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
        sourcedId: 'org-sessions-e2e',
        name: 'Sessions E2E Test School',
        type: 'school',
        identifier: 'sessions-e2e-001',
        status: 'active',
      },
    });
    testOrgId = testOrg.sourcedId;

    // Create test API key
    const key = 'test-api-key-sessions-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    await prisma.apiKey.create({
      data: {
        key: key,
        hashedKey: hashedKey,
        name: 'Sessions E2E Test Key',
        organizationId: testOrgId,
        permissions: ['read', 'write'],
        status: 'active',
      },
    });

    apiKey = key;

    // Create parent session (school year)
    const parentSession = await prisma.academicSession.create({
      data: {
        sourcedId: 'session-e2e-parent',
        title: '2025 Academic Year',
        type: 'schoolYear',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        status: 'active',
        metadata: {
          jp: {
            fiscalYear: 2025,
            schoolYearName: '令和7年度',
          },
        },
      },
    });

    parentSessionId = parentSession.sourcedId;

    // Create child sessions (terms/semesters)
    await prisma.academicSession.createMany({
      data: [
        {
          sourcedId: 'session-e2e-term1',
          title: 'First Semester 2025',
          type: 'semester',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-09-30'),
          status: 'active',
          parentSourcedId: parentSessionId,
          metadata: {
            jp: {
              termNumber: 1,
              termName: '前期',
            },
          },
        },
        {
          sourcedId: 'session-e2e-term2',
          title: 'Second Semester 2025',
          type: 'semester',
          startDate: new Date('2025-10-01'),
          endDate: new Date('2026-03-31'),
          status: 'active',
          parentSourcedId: parentSessionId,
          metadata: {
            jp: {
              termNumber: 2,
              termName: '後期',
            },
          },
        },
        {
          sourcedId: 'session-e2e-gradingperiod1',
          title: 'Q1 2025',
          type: 'gradingPeriod',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          status: 'active',
          parentSourcedId: 'session-e2e-term1',
        },
        {
          sourcedId: 'session-e2e-archived',
          title: '2024 Academic Year (Archived)',
          type: 'schoolYear',
          startDate: new Date('2024-04-01'),
          endDate: new Date('2025-03-31'),
          status: 'tobedeleted',
        },
      ],
    });

    testSessionId = 'session-e2e-term1';
  }

  /**
   * Cleanup test data from database
   */
  async function cleanupTestData() {
    await prisma.academicSession.deleteMany({
      where: { sourcedId: { startsWith: 'session-e2e-' } },
    });
    await prisma.apiKey.deleteMany({
      where: { key: { startsWith: 'test-api-key-sessions-e2e' } },
    });
    await prisma.org.deleteMany({
      where: { sourcedId: { startsWith: 'org-sessions-e2e' } },
    });
  }

  /**
   * Test: GET /ims/oneroster/v1p2/academicSessions
   * Should return list of academic sessions with pagination
   */
  describe('GET /ims/oneroster/v1p2/academicSessions', () => {
    it('should return paginated list of academic sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ limit: 3, offset: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('academicSessions');
      expect(Array.isArray(response.body.academicSessions)).toBe(true);
      expect(response.body.academicSessions.length).toBeLessThanOrEqual(3);

      // Verify session structure
      const firstSession = response.body.academicSessions[0];
      expect(firstSession).toHaveProperty('sourcedId');
      expect(firstSession).toHaveProperty('title');
      expect(firstSession).toHaveProperty('type');
      expect(firstSession).toHaveProperty('startDate');
      expect(firstSession).toHaveProperty('endDate');
      expect(firstSession).toHaveProperty('status');
    });

    it('should return 401 without API key', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .expect(401);
    });
  });

  /**
   * Test: GET /ims/oneroster/v1p2/academicSessions/:sourcedId
   * Should return single academic session by sourcedId
   */
  describe('GET /ims/oneroster/v1p2/academicSessions/:sourcedId', () => {
    it('should return single academic session', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/academicSessions/${testSessionId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('academicSession');
      expect(response.body.academicSession.sourcedId).toBe(testSessionId);
      expect(response.body.academicSession.title).toBe('First Semester 2025');
      expect(response.body.academicSession.type).toBe('semester');
      expect(response.body.academicSession.metadata.jp).toHaveProperty('termNumber');
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions/non-existent-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(404);
    });
  });

  /**
   * Test: Filtering
   * Should filter sessions by type, status, dates
   */
  describe('Filtering', () => {
    it('should filter sessions by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ filter: "type='semester'" })
        .expect(200);

      expect(response.body.academicSessions.length).toBeGreaterThan(0);
      response.body.academicSessions.forEach((session: any) => {
        expect(session.type).toBe('semester');
      });
    });

    it('should filter sessions by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ filter: "status='active'" })
        .expect(200);

      expect(response.body.academicSessions.length).toBeGreaterThan(0);
      response.body.academicSessions.forEach((session: any) => {
        expect(session.status).toBe('active');
      });
    });

    it('should filter sessions by startDate', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ filter: "startDate>='2025-04-01'" })
        .expect(200);

      expect(response.body.academicSessions.length).toBeGreaterThan(0);
      response.body.academicSessions.forEach((session: any) => {
        const startDate = new Date(session.startDate);
        expect(startDate >= new Date('2025-04-01')).toBe(true);
      });
    });
  });

  /**
   * Test: Field Selection
   * Should return only requested fields
   */
  describe('Field Selection', () => {
    it('should return only requested fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ fields: 'sourcedId,title,type' })
        .expect(200);

      const firstSession = response.body.academicSessions[0];
      expect(firstSession).toHaveProperty('sourcedId');
      expect(firstSession).toHaveProperty('title');
      expect(firstSession).toHaveProperty('type');

      // These fields should not be present
      expect(firstSession).not.toHaveProperty('dateLastModified');
      expect(firstSession).not.toHaveProperty('metadata');
    });
  });

  /**
   * Test: Sorting
   * Should sort sessions by specified field
   */
  describe('Sorting', () => {
    it('should sort sessions by startDate ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ sort: 'startDate', filter: "status='active'" })
        .expect(200);

      const dates = response.body.academicSessions.map((s: any) => new Date(s.startDate).getTime());
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
    });

    it('should sort sessions by title descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ sort: '-title', filter: "status='active'" })
        .expect(200);

      const titles = response.body.academicSessions.map((s: any) => s.title);
      const sortedTitles = [...titles].sort().reverse();
      expect(titles).toEqual(sortedTitles);
    });
  });

  /**
   * Test: PUT /ims/oneroster/v1p2/academicSessions/:sourcedId
   * Should update academic session
   */
  describe('PUT /ims/oneroster/v1p2/academicSessions/:sourcedId', () => {
    it('should update session title', async () => {
      const updatedTitle = 'First Semester 2025 (Updated)';

      const response = await request(app.getHttpServer())
        .put(`/ims/oneroster/v1p2/academicSessions/${testSessionId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          title: updatedTitle,
        })
        .expect(200);

      expect(response.body.academicSession.title).toBe(updatedTitle);

      // Verify in database
      const updatedSession = await prisma.academicSession.findUnique({
        where: { sourcedId: testSessionId },
      });
      expect(updatedSession?.title).toBe(updatedTitle);
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .put('/ims/oneroster/v1p2/academicSessions/non-existent-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ title: 'Updated' })
        .expect(404);
    });
  });

  /**
   * Test: DELETE /ims/oneroster/v1p2/academicSessions/:sourcedId
   * Should soft delete session (set status to 'tobedeleted')
   */
  describe('DELETE /ims/oneroster/v1p2/academicSessions/:sourcedId', () => {
    it('should soft delete session', async () => {
      const sessionToDelete = 'session-e2e-gradingperiod1';

      await request(app.getHttpServer())
        .delete(`/ims/oneroster/v1p2/academicSessions/${sessionToDelete}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(204);

      // Verify status changed to 'tobedeleted'
      const deletedSession = await prisma.academicSession.findUnique({
        where: { sourcedId: sessionToDelete },
      });
      expect(deletedSession?.status).toBe('tobedeleted');
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .delete('/ims/oneroster/v1p2/academicSessions/non-existent-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(404);
    });
  });

  /**
   * Test: Hierarchical Structure
   * Should correctly handle parent/child relationships
   */
  describe('Hierarchical Structure', () => {
    it('should return parent session information', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/academicSessions/${testSessionId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body.academicSession).toHaveProperty('parent');
      expect(response.body.academicSession.parent.sourcedId).toBe(parentSessionId);
      expect(response.body.academicSession.parent.type).toBe('schoolYear');
    });

    it('should return children sessions for parent', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/academicSessions/${parentSessionId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body.academicSession).toHaveProperty('children');
      expect(Array.isArray(response.body.academicSession.children)).toBe(true);
      expect(response.body.academicSession.children.length).toBeGreaterThan(0);
    });

    it('should filter sessions by parent', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/academicSessions')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ filter: `parentSourcedId='${parentSessionId}'` })
        .expect(200);

      expect(response.body.academicSessions.length).toBeGreaterThan(0);
      response.body.academicSessions.forEach((session: any) => {
        expect(session.parent.sourcedId).toBe(parentSessionId);
      });
    });
  });

  /**
   * Test: Japan Profile Metadata
   * Should validate and return Japan Profile specific fields
   */
  describe('Japan Profile Metadata', () => {
    it('should return Japan Profile metadata for school year', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/academicSessions/${parentSessionId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body.academicSession.metadata).toHaveProperty('jp');
      expect(response.body.academicSession.metadata.jp).toHaveProperty('fiscalYear');
      expect(response.body.academicSession.metadata.jp).toHaveProperty('schoolYearName');
      expect(response.body.academicSession.metadata.jp.fiscalYear).toBe(2025);
      expect(response.body.academicSession.metadata.jp.schoolYearName).toBe('令和7年度');
    });

    it('should return Japan Profile metadata for semester', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/academicSessions/${testSessionId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body.academicSession.metadata).toHaveProperty('jp');
      expect(response.body.academicSession.metadata.jp).toHaveProperty('termNumber');
      expect(response.body.academicSession.metadata.jp).toHaveProperty('termName');
      expect(response.body.academicSession.metadata.jp.termNumber).toBe(1);
      expect(response.body.academicSession.metadata.jp.termName).toBe('前期');
    });
  });
});
