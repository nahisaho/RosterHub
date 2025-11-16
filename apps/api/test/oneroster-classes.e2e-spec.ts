import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * OneRoster Classes API E2E Tests
 *
 * Tests the OneRoster v1.2 Classes API endpoints with Japan Profile 1.2.2 compliance.
 *
 * Coverage:
 * - GET /ims/oneroster/v1p2/classes (list all classes)
 * - GET /ims/oneroster/v1p2/classes/:sourcedId (get single class)
 * - PUT /ims/oneroster/v1p2/classes/:sourcedId (update class)
 * - DELETE /ims/oneroster/v1p2/classes/:sourcedId (soft delete)
 * - Authentication (API key)
 * - Pagination (limit, offset)
 * - Filtering (title, status, courseSourcedId)
 * - Sorting (field, -field)
 * - Field selection (fields parameter)
 * - Japan Profile metadata
 */
describe('OneRoster Classes API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let apiKey: string;
  let testOrgId: string;
  let testCourseId: string;
  let testClassId: string;
  let testAcademicSessionId: string;

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
        sourcedId: 'org-classes-e2e',
        name: 'Classes E2E Test School',
        type: 'school',
        identifier: 'classes-e2e-001',
        status: 'active',
      },
    });
    testOrgId = testOrg.sourcedId;

    // Create test API key
    const key = 'test-api-key-classes-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    await prisma.apiKey.create({
      data: {
        key: key,
        hashedKey: hashedKey,
        name: 'Classes E2E Test Key',
        organizationId: testOrgId,
        permissions: ['read', 'write'],
        status: 'active',
      },
    });

    apiKey = key;

    // Create academic session (required for classes)
    const academicSession = await prisma.academicSession.create({
      data: {
        sourcedId: 'session-classes-e2e',
        title: '2025 Academic Year',
        type: 'schoolYear',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        status: 'active',
      },
    });
    testAcademicSessionId = academicSession.sourcedId;

    // Create course (required for classes)
    const course = await prisma.course.create({
      data: {
        sourcedId: 'course-classes-e2e',
        title: 'Mathematics',
        courseCode: 'MATH101',
        status: 'active',
        orgSourcedId: testOrgId,
        schoolYearSourcedId: testAcademicSessionId,
      },
    });
    testCourseId = course.sourcedId;

    // Create test classes
    await prisma.class.createMany({
      data: [
        {
          sourcedId: 'class-e2e-001',
          title: 'Math 101 - Section A',
          classCode: 'MATH101-A',
          classType: 'scheduled',
          status: 'active',
          courseSourcedId: testCourseId,
          schoolSourcedId: testOrgId,
          termSourcedIds: [testAcademicSessionId],
          metadata: {
            jp: {
              subjectCode: 'M01',
              gradeLevel: '10',
            },
          },
        },
        {
          sourcedId: 'class-e2e-002',
          title: 'Math 101 - Section B',
          classCode: 'MATH101-B',
          classType: 'scheduled',
          status: 'active',
          courseSourcedId: testCourseId,
          schoolSourcedId: testOrgId,
          termSourcedIds: [testAcademicSessionId],
          metadata: {
            jp: {
              subjectCode: 'M01',
              gradeLevel: '10',
            },
          },
        },
        {
          sourcedId: 'class-e2e-003',
          title: 'Math 201 - Advanced',
          classCode: 'MATH201-A',
          classType: 'scheduled',
          status: 'active',
          courseSourcedId: testCourseId,
          schoolSourcedId: testOrgId,
          termSourcedIds: [testAcademicSessionId],
          metadata: {
            jp: {
              subjectCode: 'M02',
              gradeLevel: '11',
            },
          },
        },
        {
          sourcedId: 'class-e2e-004',
          title: 'Math 101 - Section C',
          classCode: 'MATH101-C',
          classType: 'scheduled',
          status: 'tobedeleted',
          courseSourcedId: testCourseId,
          schoolSourcedId: testOrgId,
          termSourcedIds: [testAcademicSessionId],
        },
      ],
    });

    testClassId = 'class-e2e-001';
  }

  /**
   * Cleanup test data from database
   */
  async function cleanupTestData() {
    await prisma.class.deleteMany({
      where: { sourcedId: { startsWith: 'class-e2e-' } },
    });
    await prisma.course.deleteMany({
      where: { sourcedId: { startsWith: 'course-classes-e2e' } },
    });
    await prisma.academicSession.deleteMany({
      where: { sourcedId: { startsWith: 'session-classes-e2e' } },
    });
    await prisma.apiKey.deleteMany({
      where: { key: { startsWith: 'test-api-key-classes-e2e' } },
    });
    await prisma.org.deleteMany({
      where: { sourcedId: { startsWith: 'org-classes-e2e' } },
    });
  }

  /**
   * Test: GET /ims/oneroster/v1p2/classes
   * Should return list of classes with pagination
   */
  describe('GET /ims/oneroster/v1p2/classes', () => {
    it('should return paginated list of classes', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('classes');
      expect(Array.isArray(response.body.classes)).toBe(true);
      expect(response.body.classes.length).toBeLessThanOrEqual(2);

      // Verify class structure
      const firstClass = response.body.classes[0];
      expect(firstClass).toHaveProperty('sourcedId');
      expect(firstClass).toHaveProperty('title');
      expect(firstClass).toHaveProperty('classCode');
      expect(firstClass).toHaveProperty('classType');
      expect(firstClass).toHaveProperty('status');
      expect(firstClass).toHaveProperty('metadata');
    });

    it('should return 401 without API key', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes')
        .expect(401);
    });
  });

  /**
   * Test: GET /ims/oneroster/v1p2/classes/:sourcedId
   * Should return single class by sourcedId
   */
  describe('GET /ims/oneroster/v1p2/classes/:sourcedId', () => {
    it('should return single class', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/classes/${testClassId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('class');
      expect(response.body.class.sourcedId).toBe(testClassId);
      expect(response.body.class.title).toBe('Math 101 - Section A');
      expect(response.body.class.classCode).toBe('MATH101-A');
      expect(response.body.class.metadata.jp).toHaveProperty('subjectCode');
    });

    it('should return 404 for non-existent class', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes/non-existent-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(404);
    });
  });

  /**
   * Test: Filtering
   * Should filter classes by title, status, courseSourcedId
   */
  describe('Filtering', () => {
    it('should filter classes by title (contains)', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ filter: "title~'Section A'" })
        .expect(200);

      expect(response.body.classes.length).toBeGreaterThan(0);
      expect(response.body.classes[0].title).toContain('Section A');
    });

    it('should filter classes by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ filter: "status='active'" })
        .expect(200);

      expect(response.body.classes.length).toBeGreaterThan(0);
      response.body.classes.forEach((cls: any) => {
        expect(cls.status).toBe('active');
      });
    });

    it('should filter classes by courseSourcedId', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ filter: `courseSourcedId='${testCourseId}'` })
        .expect(200);

      expect(response.body.classes.length).toBeGreaterThan(0);
      response.body.classes.forEach((cls: any) => {
        expect(cls.course.sourcedId).toBe(testCourseId);
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
        .get('/ims/oneroster/v1p2/classes')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ fields: 'sourcedId,title,classCode' })
        .expect(200);

      const firstClass = response.body.classes[0];
      expect(firstClass).toHaveProperty('sourcedId');
      expect(firstClass).toHaveProperty('title');
      expect(firstClass).toHaveProperty('classCode');

      // These fields should not be present
      expect(firstClass).not.toHaveProperty('dateLastModified');
      expect(firstClass).not.toHaveProperty('metadata');
    });
  });

  /**
   * Test: Sorting
   * Should sort classes by specified field
   */
  describe('Sorting', () => {
    it('should sort classes by title ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ sort: 'title', filter: "status='active'" })
        .expect(200);

      const titles = response.body.classes.map((c: any) => c.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });

    it('should sort classes by title descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/classes')
        .set('Authorization', `Bearer ${apiKey}`)
        .query({ sort: '-title', filter: "status='active'" })
        .expect(200);

      const titles = response.body.classes.map((c: any) => c.title);
      const sortedTitles = [...titles].sort().reverse();
      expect(titles).toEqual(sortedTitles);
    });
  });

  /**
   * Test: PUT /ims/oneroster/v1p2/classes/:sourcedId
   * Should update class
   */
  describe('PUT /ims/oneroster/v1p2/classes/:sourcedId', () => {
    it('should update class title', async () => {
      const updatedTitle = 'Math 101 - Section A (Updated)';

      const response = await request(app.getHttpServer())
        .put(`/ims/oneroster/v1p2/classes/${testClassId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          title: updatedTitle,
        })
        .expect(200);

      expect(response.body.class.title).toBe(updatedTitle);

      // Verify in database
      const updatedClass = await prisma.class.findUnique({
        where: { sourcedId: testClassId },
      });
      expect(updatedClass?.title).toBe(updatedTitle);
    });

    it('should return 404 for non-existent class', async () => {
      await request(app.getHttpServer())
        .put('/ims/oneroster/v1p2/classes/non-existent-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ title: 'Updated' })
        .expect(404);
    });
  });

  /**
   * Test: DELETE /ims/oneroster/v1p2/classes/:sourcedId
   * Should soft delete class (set status to 'tobedeleted')
   */
  describe('DELETE /ims/oneroster/v1p2/classes/:sourcedId', () => {
    it('should soft delete class', async () => {
      const classToDelete = 'class-e2e-002';

      await request(app.getHttpServer())
        .delete(`/ims/oneroster/v1p2/classes/${classToDelete}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(204);

      // Verify status changed to 'tobedeleted'
      const deletedClass = await prisma.class.findUnique({
        where: { sourcedId: classToDelete },
      });
      expect(deletedClass?.status).toBe('tobedeleted');
    });

    it('should return 404 for non-existent class', async () => {
      await request(app.getHttpServer())
        .delete('/ims/oneroster/v1p2/classes/non-existent-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(404);
    });
  });

  /**
   * Test: Japan Profile Metadata
   * Should validate and return Japan Profile specific fields
   */
  describe('Japan Profile Metadata', () => {
    it('should return Japan Profile metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/classes/${testClassId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body.class.metadata).toHaveProperty('jp');
      expect(response.body.class.metadata.jp).toHaveProperty('subjectCode');
      expect(response.body.class.metadata.jp).toHaveProperty('gradeLevel');
      expect(response.body.class.metadata.jp.subjectCode).toBe('M01');
      expect(response.body.class.metadata.jp.gradeLevel).toBe('10');
    });
  });
});
