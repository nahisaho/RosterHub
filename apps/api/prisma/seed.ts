// ============================================
// Prisma Seed Script - RosterHub
// OneRoster Japan Profile 1.2.2 Test Data
// ============================================
// Creates approximately 1,000 test records
// - 3 Organizations (1 District + 2 Schools)
// - 500 Users (50 Teachers + 450 Students)
// - 10 Courses
// - 20 Classes
// - 500 Enrollments
// - 3 Academic Sessions
// - 450 Demographics (for students)
// ============================================

import { PrismaClient, StatusType, UserRole, OrgType, ClassType, EnrollmentRole, AcademicSessionType, Sex } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Helper Functions
// ============================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Japanese name data
const familyNames = [
  '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤',
  '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水'
];

const givenNamesMale = [
  '太郎', '次郎', '健太', '翔太', '大輔', '拓也', '直樹', '和也', '達也', '雄太',
  '颯太', '蓮', '悠斗', '陽翔', '大和', '湊', '樹', '悠真', '朝陽', '海斗'
];

const givenNamesFemale = [
  '花子', '美咲', '葵', '結衣', '美月', '優奈', '陽菜', '凛', 'さくら', '愛',
  '結菜', '美羽', '心春', '杏', '詩織', '彩乃', '千尋', '真央', '楓', '桜'
];

const familyNamesKana = [
  'サトウ', 'スズキ', 'タカハシ', 'タナカ', 'イトウ', 'ワタナベ', 'ヤマモト', 'ナカムラ', 'コバヤシ', 'カトウ',
  'ヨシダ', 'ヤマダ', 'ササキ', 'ヤマグチ', 'マツモト', 'イノウエ', 'キムラ', 'ハヤシ', 'サイトウ', 'シミズ'
];

const givenNamesMaleKana = [
  'タロウ', 'ジロウ', 'ケンタ', 'ショウタ', 'ダイスケ', 'タクヤ', 'ナオキ', 'カズヤ', 'タツヤ', 'ユウタ',
  'ソウタ', 'レン', 'ユウト', 'ハルト', 'ヤマト', 'ミナト', 'イツキ', 'ユウマ', 'アサヒ', 'カイト'
];

const givenNamesFemaleKana = [
  'ハナコ', 'ミサキ', 'アオイ', 'ユイ', 'ミヅキ', 'ユウナ', 'ヒナ', 'リン', 'サクラ', 'アイ',
  'ユイナ', 'ミウ', 'コハル', 'アン', 'シオリ', 'アヤノ', 'チヒロ', 'マオ', 'カエデ', 'サクラ'
];

// Course subjects (Japanese education system)
const subjects = [
  { title: '国語', code: 'JPN' },
  { title: '算数', code: 'MTH' },
  { title: '理科', code: 'SCI' },
  { title: '社会', code: 'SOC' },
  { title: '英語', code: 'ENG' },
  { title: '音楽', code: 'MUS' },
  { title: '図画工作', code: 'ART' },
  { title: '体育', code: 'PE' },
  { title: '家庭', code: 'HEC' },
  { title: '道徳', code: 'ETH' }
];

// ============================================
// Seed Data Generation
// ============================================

async function main() {
  console.log('🌱 Starting seed...');
  console.log('📦 Clearing existing data...');

  // Clear existing data in correct order (foreign key constraints)
  await prisma.enrollment.deleteMany();
  await prisma.classAcademicSession.deleteMany();
  await prisma.class.deleteMany();
  await prisma.course.deleteMany();
  await prisma.demographic.deleteMany();
  await prisma.userOrg.deleteMany();
  await prisma.userAgent.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.org.deleteMany();

  console.log('✅ Existing data cleared');

  // ============================================
  // 1. Create Organizations (3)
  // ============================================
  console.log('🏢 Creating organizations...');

  const district = await prisma.org.create({
    data: {
      sourcedId: 'org-district-001',
      name: '東京都教育委員会',
      type: OrgType.district,
      identifier: 'tokyo-boe-001',
      metadata: {
        'jp.localId': '13000',
        'jp.prefectureCode': '13',
        'jp.address': '東京都新宿区西新宿2-8-1'
      }
    }
  });

  const school1 = await prisma.org.create({
    data: {
      sourcedId: 'org-school-001',
      name: '東京都立第一小学校',
      type: OrgType.school,
      identifier: 'tokyo-es-001',
      parentSourcedId: district.sourcedId,
      metadata: {
        'jp.localId': '13001',
        'jp.schoolCode': 'A100001',
        'jp.address': '東京都千代田区丸の内1-1-1'
      }
    }
  });

  const school2 = await prisma.org.create({
    data: {
      sourcedId: 'org-school-002',
      name: '東京都立第二小学校',
      type: OrgType.school,
      identifier: 'tokyo-es-002',
      parentSourcedId: district.sourcedId,
      metadata: {
        'jp.localId': '13002',
        'jp.schoolCode': 'A100002',
        'jp.address': '東京都渋谷区渋谷1-1-1'
      }
    }
  });

  console.log(`✅ Created ${3} organizations`);

  // ============================================
  // 2. Create Academic Sessions (3)
  // ============================================
  console.log('📅 Creating academic sessions...');

  const schoolYear = await prisma.academicSession.create({
    data: {
      sourcedId: 'session-2025',
      title: '2025年度',
      type: AcademicSessionType.schoolYear,
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      schoolYear: '2025'
    }
  });

  const term1 = await prisma.academicSession.create({
    data: {
      sourcedId: 'session-2025-t1',
      title: '2025年度 1学期',
      type: AcademicSessionType.term,
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-07-20'),
      schoolYear: '2025',
      parentSourcedId: schoolYear.sourcedId
    }
  });

  const term2 = await prisma.academicSession.create({
    data: {
      sourcedId: 'session-2025-t2',
      title: '2025年度 2学期',
      type: AcademicSessionType.term,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-25'),
      schoolYear: '2025',
      parentSourcedId: schoolYear.sourcedId
    }
  });

  console.log(`✅ Created ${3} academic sessions`);

  // ============================================
  // 3. Create Users (500: 50 Teachers + 450 Students)
  // ============================================
  console.log('👥 Creating users...');

  const schools = [school1, school2];
  const users: { sourcedId: string; role: UserRole; schoolSourcedId: string }[] = [];

  // Create 50 teachers (25 per school)
  for (let i = 0; i < 50; i++) {
    const school = schools[i % 2];
    const familyIdx = i % familyNames.length;
    const givenIdx = i % givenNamesMale.length;
    const isMale = i % 2 === 0;
    const sourcedId = `user-teacher-${String(i + 1).padStart(3, '0')}`;

    await prisma.user.create({
      data: {
        sourcedId,
        enabledUser: true,
        username: `teacher${String(i + 1).padStart(3, '0')}`,
        userIds: [`T${String(i + 1).padStart(5, '0')}`],
        givenName: isMale ? givenNamesMale[givenIdx] : givenNamesFemale[givenIdx],
        familyName: familyNames[familyIdx],
        role: UserRole.teacher,
        identifier: `teacher-${String(i + 1).padStart(5, '0')}`,
        email: `teacher${String(i + 1).padStart(3, '0')}@example.ed.jp`,
        metadata: {
          'jp.kanaGivenName': isMale ? givenNamesMaleKana[givenIdx] : givenNamesFemaleKana[givenIdx],
          'jp.kanaFamilyName': familyNamesKana[familyIdx],
          'jp.staffType': randomChoice(['regular', 'partTime', 'substitute'])
        },
        orgs: {
          create: {
            orgSourcedId: school.sourcedId
          }
        }
      }
    });

    users.push({ sourcedId, role: UserRole.teacher, schoolSourcedId: school.sourcedId });
  }

  // Create 450 students (225 per school, ~37-38 per class)
  for (let i = 0; i < 450; i++) {
    const school = schools[i % 2];
    const familyIdx = i % familyNames.length;
    const givenIdx = i % givenNamesMale.length;
    const isMale = i % 2 === 0;
    const sourcedId = `user-student-${String(i + 1).padStart(3, '0')}`;
    const grade = (i % 6) + 1; // Grades 1-6
    const birthYear = 2025 - 6 - grade;

    const user = await prisma.user.create({
      data: {
        sourcedId,
        enabledUser: true,
        username: `student${String(i + 1).padStart(3, '0')}`,
        userIds: [`S${String(i + 1).padStart(5, '0')}`],
        givenName: isMale ? givenNamesMale[givenIdx] : givenNamesFemale[givenIdx],
        familyName: familyNames[familyIdx],
        role: UserRole.student,
        identifier: `student-${String(i + 1).padStart(5, '0')}`,
        email: `student${String(i + 1).padStart(3, '0')}@example.ed.jp`,
        metadata: {
          'jp.kanaGivenName': isMale ? givenNamesMaleKana[givenIdx] : givenNamesFemaleKana[givenIdx],
          'jp.kanaFamilyName': familyNamesKana[familyIdx],
          'jp.grade': grade.toString(),
          'jp.attendanceNumber': String((i % 40) + 1).padStart(2, '0')
        },
        orgs: {
          create: {
            orgSourcedId: school.sourcedId
          }
        }
      }
    });

    users.push({ sourcedId, role: UserRole.student, schoolSourcedId: school.sourcedId });

    // Create demographic for students
    await prisma.demographic.create({
      data: {
        sourcedId: `demo-${String(i + 1).padStart(3, '0')}`,
        userSourcedId: sourcedId,
        birthDate: randomDate(new Date(`${birthYear}-04-02`), new Date(`${birthYear + 1}-04-01`)),
        sex: isMale ? Sex.male : Sex.female,
        metadata: {
          'jp.nationality': 'JP'
        }
      }
    });
  }

  console.log(`✅ Created ${500} users (50 teachers + 450 students)`);
  console.log(`✅ Created ${450} demographics`);

  // ============================================
  // 4. Create Courses (10 per school = 20 total)
  // ============================================
  console.log('📚 Creating courses...');

  const courses: { sourcedId: string; schoolSourcedId: string }[] = [];

  for (const school of schools) {
    for (const subject of subjects) {
      const courseSuffix = school === school1 ? '001' : '002';
      const sourcedId = `course-${subject.code}-${courseSuffix}`;

      await prisma.course.create({
        data: {
          sourcedId,
          title: subject.title,
          courseCode: `${subject.code}-${courseSuffix}`,
          schoolYear: '2025',
          schoolSourcedId: school.sourcedId,
          metadata: {
            'jp.subjectArea': subject.title
          }
        }
      });

      courses.push({ sourcedId, schoolSourcedId: school.sourcedId });
    }
  }

  console.log(`✅ Created ${20} courses`);

  // ============================================
  // 5. Create Classes (12 per school = 24 total, 6 grades x 2 classes)
  // ============================================
  console.log('🏫 Creating classes...');

  const classes: { sourcedId: string; schoolSourcedId: string; grade: number }[] = [];

  for (const school of schools) {
    const schoolSuffix = school === school1 ? '001' : '002';
    const mathCourse = courses.find(c => c.sourcedId.includes('MTH') && c.schoolSourcedId === school.sourcedId);

    for (let grade = 1; grade <= 6; grade++) {
      for (let classNum = 1; classNum <= 2; classNum++) {
        const sourcedId = `class-${schoolSuffix}-${grade}-${classNum}`;

        const classRecord = await prisma.class.create({
          data: {
            sourcedId,
            title: `${grade}年${classNum}組`,
            classCode: `${schoolSuffix}-G${grade}C${classNum}`,
            classType: ClassType.homeroom,
            location: `${grade}階 ${classNum}組教室`,
            courseSourcedId: mathCourse!.sourcedId,
            schoolSourcedId: school.sourcedId,
            metadata: {
              'jp.grade': grade.toString(),
              'jp.classNumber': classNum.toString()
            }
          }
        });

        // Link class to academic sessions
        await prisma.classAcademicSession.create({
          data: {
            classSourcedId: sourcedId,
            academicSessionSourcedId: schoolYear.sourcedId
          }
        });

        classes.push({ sourcedId, schoolSourcedId: school.sourcedId, grade });
      }
    }
  }

  console.log(`✅ Created ${24} classes`);

  // ============================================
  // 6. Create Enrollments (500)
  // ============================================
  console.log('📝 Creating enrollments...');

  let enrollmentCount = 0;

  // Assign teachers to classes (each teacher to ~2 classes)
  const teachers = users.filter(u => u.role === UserRole.teacher);
  let teacherIdx = 0;

  for (const cls of classes) {
    // Find teachers from same school
    const schoolTeachers = teachers.filter(t => t.schoolSourcedId === cls.schoolSourcedId);

    // Assign 2 teachers per class
    for (let i = 0; i < 2; i++) {
      const teacher = schoolTeachers[(teacherIdx + i) % schoolTeachers.length];

      await prisma.enrollment.create({
        data: {
          sourcedId: `enroll-t-${String(enrollmentCount + 1).padStart(4, '0')}`,
          role: i === 0 ? EnrollmentRole.primary : EnrollmentRole.secondary,
          primary: i === 0,
          userSourcedId: teacher.sourcedId,
          classSourcedId: cls.sourcedId,
          schoolSourcedId: cls.schoolSourcedId,
          beginDate: new Date('2025-04-01'),
          endDate: new Date('2026-03-31')
        }
      });
      enrollmentCount++;
    }
    teacherIdx++;
  }

  // Assign students to homeroom classes
  const students = users.filter(u => u.role === UserRole.student);

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const grade = (i % 6) + 1;
    const classNum = (Math.floor(i / 6) % 2) + 1;

    // Find matching class
    const cls = classes.find(c =>
      c.schoolSourcedId === student.schoolSourcedId &&
      c.grade === grade
    );

    if (cls) {
      await prisma.enrollment.create({
        data: {
          sourcedId: `enroll-s-${String(enrollmentCount + 1).padStart(4, '0')}`,
          role: EnrollmentRole.primary,
          primary: true,
          userSourcedId: student.sourcedId,
          classSourcedId: cls.sourcedId,
          schoolSourcedId: cls.schoolSourcedId,
          beginDate: new Date('2025-04-01'),
          endDate: new Date('2026-03-31')
        }
      });
      enrollmentCount++;
    }
  }

  console.log(`✅ Created ${enrollmentCount} enrollments`);

  // ============================================
  // Summary
  // ============================================
  console.log('\n📊 Seed Summary:');
  console.log('================');
  console.log(`Organizations:     3 (1 district + 2 schools)`);
  console.log(`Academic Sessions: 3 (1 year + 2 terms)`);
  console.log(`Users:             500 (50 teachers + 450 students)`);
  console.log(`Demographics:      450`);
  console.log(`Courses:           20 (10 per school)`);
  console.log(`Classes:           24 (12 per school, 6 grades × 2 classes)`);
  console.log(`Enrollments:       ${enrollmentCount}`);
  console.log('================');
  console.log(`Total Records:     ~${3 + 3 + 500 + 450 + 20 + 24 + enrollmentCount}`);
  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
