import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * OneRoster Courses API E2E Tests
 *
 * Tests the OneRoster v1.2 Courses API endpoints with Japan Profile 1.2.2 compliance.
 *
 * Coverage:
 * - GET /ims/oneroster/v1p2/courses (list all courses)
 * - GET /ims/oneroster/v1p2/courses/:sourcedId (get single course)
 * - PUT /ims/oneroster/v1p2/courses/:sourcedId (update course)
 * - DELETE /ims/oneroster/v1p2/courses/:sourcedId (soft delete)
 * - Authentication (API key)
 * - Pagination (limit, offset)
 * - Filtering (title, courseCode, status)
 * - Sorting (field, -field)
 * - Field selection (fields parameter)
 * - Japan Profile metadata
 */
describe('OneRoster Courses API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let apiKey: string;
  let testOrgId: string;
  let testCourseId: string;
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
        sourcedId: 'org-courses-e2e',
        name: 'Courses E2E Test School',
        type: 'school',
        identifier: 'courses-e2e-001',
      },
    });
    testOrgId = testOrg.sourcedId;

    // Create test API key
    const key = 'test-api-key-courses-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    await prisma.apiKey.create({
      data: {
        key: key,
        hashedKey: hashedKey,
        name: 'Courses E2E Test Key',
        organizationId: testOrgId,
      },
    });

    apiKey = key;

    // Create academic session
    const academicSession = await prisma.academicSession.create({
      data: {
        sourcedId: 'session-courses-e2e',
        title: '2025 Academic Year',
        type: 'schoolYear',
        schoolYear: '2025',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
      },
    });
    testAcademicSessionId = academicSession.sourcedId;

    // Create test courses
    await prisma.course.createMany({
      data: [
        {
          sourcedId: 'course-e2e-001',
          title: 'Mathematics I',
          courseCode: 'MATH101',
          schoolSourcedId: testOrgId,
          schoolYear: testAcademicSessionId,
          metadata: {
            jp: {
              subjectArea: 'mathematics',
              credits: 4,
            },
          },
        },
        {
          sourcedId: 'course-e2e-002',
          title: 'English Language Arts',
          courseCode: 'ENG101',
          schoolSourcedId: testOrgId,
          schoolYear: testAcademicSessionId,
          metadata: {
            jp: {
              subjectArea: 'language',
              credits: 3,
            },
          },
        },
        {
          sourcedId: 'course-e2e-003',
          title: 'Physics',
          courseCode: 'PHY201',
          schoolSourcedId: testOrgId,
          schoolYear: testAcademicSessionId,
          metadata: {
            jp: {
              subjectArea: 'science',
              credits: 4,
            },
          },
        },
        {
          sourcedId: 'course-e2e-004',
          title: 'Chemistry (Archived)',
          courseCode: 'CHEM101',
          status: 'tobedeleted',
          schoolSourcedId: testOrgId,
          schoolYear: testAcademicSessionId,
          metadata: {
            jp: {
              subjectArea: 'science',
              credits: 4,
            },
          },
        },
      ],
    });

    testCourseId = 'course-e2e-001';
  }

  /**
   * Cleanup test data from database
   */
  async function cleanupTestData() {
    await prisma.course.deleteMany({
      where: { sourcedId: { startsWith: 'course-e2e-' } },
    });
    await prisma.academicSession.deleteMany({
      where: { sourcedId: { startsWith: 'session-courses-e2e' } },
    });
    await prisma.apiKey.deleteMany({
      where: { key: { startsWith: 'test-api-key-courses-e2e' } },
    });
    await prisma.org.deleteMany({
      where: { sourcedId: { startsWith: 'org-courses-e2e' } },
    });
  }

  /**
   * Test: GET /ims/oneroster/v1p2/courses
   * Should return list of courses with pagination
   */
  describe('GET /ims/oneroster/v1p2/courses', () => {
    it('should return paginated list of courses', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses')
        .set('X-API-Key', apiKey)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('courses');
      expect(Array.isArray(response.body.courses)).toBe(true);
      expect(response.body.courses.length).toBeLessThanOrEqual(2);

      // Verify course structure
      const firstCourse = response.body.courses[0];
      expect(firstCourse).toHaveProperty('sourcedId');
      expect(firstCourse).toHaveProperty('title');
      expect(firstCourse).toHaveProperty('courseCode');
      expect(firstCourse).toHaveProperty('status');
      expect(firstCourse).toHaveProperty('metadata');
    });

    it('should return 401 without API key', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses')
        .expect(401);
    });
  });

  /**
   * Test: GET /ims/oneroster/v1p2/courses/:sourcedId
   * Should return single course by sourcedId
   */
  describe('GET /ims/oneroster/v1p2/courses/:sourcedId', () => {
    it('should return single course', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/courses/${testCourseId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object, not wrapped
      expect(response.body.sourcedId).toBe(testCourseId);
      expect(response.body.title).toBe('Mathematics I');
      expect(response.body.courseCode).toBe('MATH101');
      expect(response.body.metadata.jp).toHaveProperty('subjectArea');
      expect(response.body.metadata.jp).toHaveProperty('credits');
    });

    it('should return 404 for non-existent course', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses/non-existent-id')
        .set('X-API-Key', apiKey)
        .expect(404);
    });
  });

  /**
   * Test: Filtering
   * Should filter courses by title, courseCode, status
   */
  describe('Filtering', () => {
    it('should filter courses by title (contains)', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses')
        .set('X-API-Key', apiKey)
        .query({ filter: "title~'Mathematics'" })
        .expect(200);

      expect(response.body.courses.length).toBeGreaterThan(0);
      expect(response.body.courses[0].title).toContain('Mathematics');
    });

    it('should filter courses by courseCode', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses')
        .set('X-API-Key', apiKey)
        .query({ filter: "courseCode='MATH101'" })
        .expect(200);

      expect(response.body.courses.length).toBe(1);
      expect(response.body.courses[0].courseCode).toBe('MATH101');
    });

    it('should filter courses by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses')
        .set('X-API-Key', apiKey)
        .query({ filter: "status='active'" })
        .expect(200);

      expect(response.body.courses.length).toBeGreaterThan(0);
      response.body.courses.forEach((course: any) => {
        expect(course.status).toBe('active');
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
        .get('/ims/oneroster/v1p2/courses')
        .set('X-API-Key', apiKey)
        .query({ fields: 'sourcedId,title,courseCode' })
        .expect(200);

      const firstCourse = response.body.courses[0];
      expect(firstCourse).toHaveProperty('sourcedId');
      expect(firstCourse).toHaveProperty('title');
      expect(firstCourse).toHaveProperty('courseCode');

      // These fields should not be present
      expect(firstCourse).not.toHaveProperty('dateLastModified');
      expect(firstCourse).not.toHaveProperty('metadata');
    });
  });

  /**
   * Test: Sorting
   * Should sort courses by specified field
   */
  describe('Sorting', () => {
    it('should sort courses by title ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses')
        .set('X-API-Key', apiKey)
        .query({ sort: 'title', filter: "status='active'" })
        .expect(200);

      const titles = response.body.courses.map((c: any) => c.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });

    it('should sort courses by courseCode descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/courses')
        .set('X-API-Key', apiKey)
        .query({ sort: '-courseCode', filter: "status='active'" })
        .expect(200);

      const codes = response.body.courses.map((c: any) => c.courseCode);
      const sortedCodes = [...codes].sort().reverse();
      expect(codes).toEqual(sortedCodes);
    });
  });

  /**
   * Test: PUT /ims/oneroster/v1p2/courses/:sourcedId
   * Should update course
   */
  describe('PUT /ims/oneroster/v1p2/courses/:sourcedId', () => {
    it('should update course title', async () => {
      const updatedTitle = 'Mathematics I (Advanced)';

      const response = await request(app.getHttpServer())
        .put(`/ims/oneroster/v1p2/courses/${testCourseId}`)
        .set('X-API-Key', apiKey)
        .send({
          title: updatedTitle,
        })
        .expect(200);

      // API returns direct object
      expect(response.body.title).toBe(updatedTitle);

      // Verify in database
      const updatedCourse = await prisma.course.findUnique({
        where: { sourcedId: testCourseId },
      });
      expect(updatedCourse?.title).toBe(updatedTitle);
    });

    it('should return 404 for non-existent course', async () => {
      await request(app.getHttpServer())
        .put('/ims/oneroster/v1p2/courses/non-existent-id')
        .set('X-API-Key', apiKey)
        .send({ title: 'Updated' })
        .expect(404);
    });
  });

  /**
   * Test: DELETE /ims/oneroster/v1p2/courses/:sourcedId
   * Should soft delete course (set status to 'tobedeleted')
   */
  describe('DELETE /ims/oneroster/v1p2/courses/:sourcedId', () => {
    it('should soft delete course', async () => {
      const courseToDelete = 'course-e2e-002';

      await request(app.getHttpServer())
        .delete(`/ims/oneroster/v1p2/courses/${courseToDelete}`)
        .set('X-API-Key', apiKey)
        .expect(204);

      // Verify status changed to 'tobedeleted'
      const deletedCourse = await prisma.course.findUnique({
        where: { sourcedId: courseToDelete },
      });
      expect(deletedCourse?.status).toBe('tobedeleted');
    });

    it('should return 404 for non-existent course', async () => {
      await request(app.getHttpServer())
        .delete('/ims/oneroster/v1p2/courses/non-existent-id')
        .set('X-API-Key', apiKey)
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
        .get(`/ims/oneroster/v1p2/courses/${testCourseId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object
      expect(response.body.metadata).toHaveProperty('jp');
      expect(response.body.metadata.jp).toHaveProperty('subjectArea');
      expect(response.body.metadata.jp).toHaveProperty('credits');
      expect(response.body.metadata.jp.subjectArea).toBe('mathematics');
      expect(response.body.metadata.jp.credits).toBe(4);
    });
  });
});
