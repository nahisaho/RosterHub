import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * OneRoster Enrollments API E2E Tests
 *
 * Tests the OneRoster v1.2 Enrollments API endpoints with Japan Profile 1.2.2 compliance.
 *
 * Coverage:
 * - GET /ims/oneroster/v1p2/enrollments (list all enrollments)
 * - GET /ims/oneroster/v1p2/enrollments/:sourcedId (get single enrollment)
 * - GET /ims/oneroster/v1p2/classes/:classId/enrollments (enrollments for class)
 * - GET /ims/oneroster/v1p2/users/:userId/enrollments (enrollments for user)
 * - PUT /ims/oneroster/v1p2/enrollments/:sourcedId (update enrollment)
 * - DELETE /ims/oneroster/v1p2/enrollments/:sourcedId (soft delete)
 * - Authentication (API key)
 * - Pagination (limit, offset)
 * - Filtering (role, status, beginDate, endDate)
 * - Sorting (field, -field)
 * - Field selection (fields parameter)
 * - Japan Profile metadata
 */
describe('OneRoster Enrollments API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let apiKey: string;
  let testOrgId: string;
  let testUserId: string;
  let testClassId: string;
  let testCourseId: string;
  let testEnrollmentId: string;
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
        sourcedId: 'org-enrollments-e2e',
        name: 'Enrollments E2E Test School',
        type: 'school',
        identifier: 'enrollments-e2e-001',
      },
    });
    testOrgId = testOrg.sourcedId;

    // Create test API key
    const key = 'test-api-key-enrollments-e2e';
    const hashedKey = await bcrypt.hash(key, 10);

    await prisma.apiKey.create({
      data: {
        key: key,
        hashedKey: hashedKey,
        name: 'Enrollments E2E Test Key',
        organizationId: testOrgId,
      },
    });

    apiKey = key;

    // Create academic session
    const academicSession = await prisma.academicSession.create({
      data: {
        sourcedId: 'session-enrollments-e2e',
        title: '2025 Academic Year',
        type: 'schoolYear',
        schoolYear: '2025',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
      },
    });
    testAcademicSessionId = academicSession.sourcedId;

    // Create course
    const course = await prisma.course.create({
      data: {
        sourcedId: 'course-enrollments-e2e',
        title: 'Mathematics',
        courseCode: 'MATH101',
        schoolSourcedId: testOrgId,
        schoolYear: testAcademicSessionId,
      },
    });
    testCourseId = course.sourcedId;

    // Create class
    const testClass = await prisma.class.create({
      data: {
        sourcedId: 'class-enrollments-e2e',
        title: 'Math 101 - Section A',
        classCode: 'MATH101-A',
        classType: 'scheduled',
        courseSourcedId: testCourseId,
        schoolSourcedId: testOrgId,
      },
    });
    testClassId = testClass.sourcedId;

    // Create test users
    const student1 = await prisma.user.create({
      data: {
        sourcedId: 'user-enroll-student1',
        enabledUser: true,
        username: 'student1',
        givenName: 'Taro',
        familyName: 'Tanaka',
        role: 'student',
        email: 'student1@example.jp',
        identifier: 'user-enroll-student1-id',
        userIds: [],
        metadata: {
          jp: {
            kanaGivenName: 'タロウ',
            kanaFamilyName: 'タナカ',
          },
        },
      },
    });

    const student2 = await prisma.user.create({
      data: {
        sourcedId: 'user-enroll-student2',
        enabledUser: true,
        username: 'student2',
        givenName: 'Hanako',
        familyName: 'Suzuki',
        role: 'student',
        email: 'student2@example.jp',
        identifier: 'user-enroll-student2-id',
        userIds: [],
        metadata: {
          jp: {
            kanaGivenName: 'ハナコ',
            kanaFamilyName: 'スズキ',
          },
        },
      },
    });

    const teacher = await prisma.user.create({
      data: {
        sourcedId: 'user-enroll-teacher',
        enabledUser: true,
        username: 'teacher1',
        givenName: 'Yuki',
        familyName: 'Sato',
        role: 'teacher',
        email: 'teacher1@example.jp',
        identifier: 'user-enroll-teacher-id',
        userIds: [],
        metadata: {
          jp: {
            kanaGivenName: 'ユキ',
            kanaFamilyName: 'サトウ',
          },
        },
      },
    });

    testUserId = student1.sourcedId;

    // Create test enrollments
    await prisma.enrollment.createMany({
      data: [
        {
          sourcedId: 'enrollment-e2e-001',
          classSourcedId: testClassId,
          schoolSourcedId: testOrgId,
          userSourcedId: student1.sourcedId,
          role: 'primary',
          primary: true,
          beginDate: new Date('2025-04-01'),
          endDate: new Date('2026-03-31'),
          metadata: {
            jp: {
              attendanceNumber: '001',
            },
          },
        },
        {
          sourcedId: 'enrollment-e2e-002',
          classSourcedId: testClassId,
          schoolSourcedId: testOrgId,
          userSourcedId: student2.sourcedId,
          role: 'primary',
          primary: true,
          beginDate: new Date('2025-04-01'),
          endDate: new Date('2026-03-31'),
          metadata: {
            jp: {
              attendanceNumber: '002',
            },
          },
        },
        {
          sourcedId: 'enrollment-e2e-003',
          classSourcedId: testClassId,
          schoolSourcedId: testOrgId,
          userSourcedId: teacher.sourcedId,
          role: 'aide',
          primary: true,
          beginDate: new Date('2025-04-01'),
          endDate: new Date('2026-03-31'),
          metadata: {
            jp: {
              primary: true,
            },
          },
        },
      ],
    });

    testEnrollmentId = 'enrollment-e2e-001';
  }

  /**
   * Cleanup test data from database
   */
  async function cleanupTestData() {
    await prisma.enrollment.deleteMany({
      where: { sourcedId: { startsWith: 'enrollment-e2e-' } },
    });
    await prisma.user.deleteMany({
      where: { sourcedId: { startsWith: 'user-enroll-' } },
    });
    await prisma.class.deleteMany({
      where: { sourcedId: { startsWith: 'class-enrollments-e2e' } },
    });
    await prisma.course.deleteMany({
      where: { sourcedId: { startsWith: 'course-enrollments-e2e' } },
    });
    await prisma.academicSession.deleteMany({
      where: { sourcedId: { startsWith: 'session-enrollments-e2e' } },
    });
    await prisma.apiKey.deleteMany({
      where: { key: { startsWith: 'test-api-key-enrollments-e2e' } },
    });
    await prisma.org.deleteMany({
      where: { sourcedId: { startsWith: 'org-enrollments-e2e' } },
    });
  }

  /**
   * Test: GET /ims/oneroster/v1p2/enrollments
   * Should return list of enrollments with pagination
   */
  describe('GET /ims/oneroster/v1p2/enrollments', () => {
    it('should return paginated list of enrollments', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments')
        .set('X-API-Key', apiKey)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('enrollments');
      expect(Array.isArray(response.body.enrollments)).toBe(true);
      expect(response.body.enrollments.length).toBeLessThanOrEqual(2);

      // Verify enrollment structure
      const firstEnrollment = response.body.enrollments[0];
      expect(firstEnrollment).toHaveProperty('sourcedId');
      expect(firstEnrollment).toHaveProperty('role');
      expect(firstEnrollment).toHaveProperty('status');
      expect(firstEnrollment).toHaveProperty('userSourcedId');
      expect(firstEnrollment).toHaveProperty('classSourcedId');
    });

    it('should return 401 without API key', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments')
        .expect(401);
    });
  });

  /**
   * Test: GET /ims/oneroster/v1p2/enrollments/:sourcedId
   * Should return single enrollment by sourcedId
   */
  describe('GET /ims/oneroster/v1p2/enrollments/:sourcedId', () => {
    it('should return single enrollment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/enrollments/${testEnrollmentId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object, not wrapped
      expect(response.body.sourcedId).toBe(testEnrollmentId);
      expect(response.body.role).toBe('primary');
      expect(response.body.status).toBe('active');
      expect(response.body.metadata.jp).toHaveProperty('attendanceNumber');
    });

    it('should return 404 for non-existent enrollment', async () => {
      await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments/non-existent-id')
        .set('X-API-Key', apiKey)
        .expect(404);
    });
  });

  /**
   * Test: GET /ims/oneroster/v1p2/classes/:classId/enrollments
   * Should return enrollments for specific class
   */
  describe('GET /ims/oneroster/v1p2/classes/:classId/enrollments', () => {
    it('should return enrollments for class', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/classes/${testClassId}/enrollments`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('enrollments');
      expect(response.body.enrollments.length).toBeGreaterThan(0);

      response.body.enrollments.forEach((enrollment: any) => {
        expect(enrollment.classSourcedId).toBe(testClassId);
      });
    });
  });

  /**
   * Test: GET /ims/oneroster/v1p2/users/:userId/enrollments
   * Should return enrollments for specific user
   */
  describe('GET /ims/oneroster/v1p2/users/:userId/enrollments', () => {
    it('should return enrollments for user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/users/${testUserId}/enrollments`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('enrollments');
      expect(response.body.enrollments.length).toBeGreaterThan(0);

      response.body.enrollments.forEach((enrollment: any) => {
        expect(enrollment.userSourcedId).toBe(testUserId);
      });
    });
  });

  /**
   * Test: Filtering
   * Should filter enrollments by role, status, dates
   */
  describe('Filtering', () => {
    it('should filter enrollments by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments')
        .set('X-API-Key', apiKey)
        .query({ filter: "role='primary'" })
        .expect(200);

      expect(response.body.enrollments.length).toBeGreaterThan(0);
      response.body.enrollments.forEach((enrollment: any) => {
        expect(enrollment.role).toBe('primary');
      });
    });

    it('should filter enrollments by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments')
        .set('X-API-Key', apiKey)
        .query({ filter: "status='active'" })
        .expect(200);

      expect(response.body.enrollments.length).toBeGreaterThan(0);
      response.body.enrollments.forEach((enrollment: any) => {
        expect(enrollment.status).toBe('active');
      });
    });

    it('should filter enrollments by beginDate', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments')
        .set('X-API-Key', apiKey)
        .query({ filter: "beginDate>='2025-04-01'" })
        .expect(200);

      expect(response.body.enrollments.length).toBeGreaterThan(0);
      response.body.enrollments.forEach((enrollment: any) => {
        const beginDate = new Date(enrollment.beginDate);
        expect(beginDate >= new Date('2025-04-01')).toBe(true);
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
        .get('/ims/oneroster/v1p2/enrollments')
        .set('X-API-Key', apiKey)
        .query({ fields: 'sourcedId,role,status' })
        .expect(200);

      const firstEnrollment = response.body.enrollments[0];
      expect(firstEnrollment).toHaveProperty('sourcedId');
      expect(firstEnrollment).toHaveProperty('role');
      expect(firstEnrollment).toHaveProperty('status');

      // These fields should not be present
      expect(firstEnrollment).not.toHaveProperty('beginDate');
      expect(firstEnrollment).not.toHaveProperty('metadata');
    });
  });

  /**
   * Test: Sorting
   * Should sort enrollments by specified field
   */
  describe('Sorting', () => {
    it('should sort enrollments by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments')
        .set('X-API-Key', apiKey)
        .query({ sort: 'role', filter: "status='active'" })
        .expect(200);

      const roles = response.body.enrollments.map((e: any) => e.role);
      const sortedRoles = [...roles].sort();
      expect(roles).toEqual(sortedRoles);
    });
  });

  /**
   * Test: PUT /ims/oneroster/v1p2/enrollments/:sourcedId
   * Should update enrollment
   */
  describe('PUT /ims/oneroster/v1p2/enrollments/:sourcedId', () => {
    it('should update enrollment role', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ims/oneroster/v1p2/enrollments/${testEnrollmentId}`)
        .set('X-API-Key', apiKey)
        .send({
          role: 'aide',
        })
        .expect(200);

      // API returns direct object
      expect(response.body.role).toBe('aide');

      // Verify in database
      const updatedEnrollment = await prisma.enrollment.findUnique({
        where: { sourcedId: testEnrollmentId },
      });
      expect(updatedEnrollment?.role).toBe('aide');
    });

    it('should return 404 for non-existent enrollment', async () => {
      await request(app.getHttpServer())
        .put('/ims/oneroster/v1p2/enrollments/non-existent-id')
        .set('X-API-Key', apiKey)
        .send({ role: 'primary' })
        .expect(404);
    });
  });

  /**
   * Test: DELETE /ims/oneroster/v1p2/enrollments/:sourcedId
   * Should soft delete enrollment (set status to 'tobedeleted')
   */
  describe('DELETE /ims/oneroster/v1p2/enrollments/:sourcedId', () => {
    it('should soft delete enrollment', async () => {
      const enrollmentToDelete = 'enrollment-e2e-002';

      await request(app.getHttpServer())
        .delete(`/ims/oneroster/v1p2/enrollments/${enrollmentToDelete}`)
        .set('X-API-Key', apiKey)
        .expect(204);

      // Verify status changed to 'tobedeleted'
      const deletedEnrollment = await prisma.enrollment.findUnique({
        where: { sourcedId: enrollmentToDelete },
      });
      expect(deletedEnrollment?.status).toBe('tobedeleted');
    });

    it('should return 404 for non-existent enrollment', async () => {
      await request(app.getHttpServer())
        .delete('/ims/oneroster/v1p2/enrollments/non-existent-id')
        .set('X-API-Key', apiKey)
        .expect(404);
    });
  });

  /**
   * Test: Japan Profile Metadata
   * Should validate and return Japan Profile specific fields
   */
  describe('Japan Profile Metadata', () => {
    it('should return Japan Profile metadata for student enrollment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ims/oneroster/v1p2/enrollments/${testEnrollmentId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object
      expect(response.body.metadata).toHaveProperty('jp');
      expect(response.body.metadata.jp).toHaveProperty('attendanceNumber');
      expect(response.body.metadata.jp.attendanceNumber).toBe('001');
    });

    it('should return Japan Profile metadata for teacher enrollment', async () => {
      const response = await request(app.getHttpServer())
        .get('/ims/oneroster/v1p2/enrollments/enrollment-e2e-003')
        .set('X-API-Key', apiKey)
        .expect(200);

      // API returns direct object
      expect(response.body.metadata).toHaveProperty('jp');
      expect(response.body.metadata.jp).toHaveProperty('primary');
      expect(response.body.metadata.jp.primary).toBe(true);
    });
  });
});
