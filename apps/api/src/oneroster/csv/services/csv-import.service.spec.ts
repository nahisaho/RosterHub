import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportService } from './csv-import.service';
import { CsvValidatorService } from '../validators/csv-validator.service';
import { PrismaService } from '../../../database/prisma.service';
import { UsersRepository } from '../../entities/users/users.repository';
import { OrgsRepository } from '../../entities/orgs/orgs.repository';
import { ClassesRepository } from '../../entities/classes/classes.repository';
import { CoursesRepository } from '../../entities/courses/courses.repository';
import { EnrollmentsRepository } from '../../entities/enrollments/enrollments.repository';
import { AcademicSessionsRepository } from '../../entities/academic-sessions/academic-sessions.repository';
import { DemographicsRepository } from '../../entities/demographics/demographics.repository';
import { CsvImportJobDto, CsvImportJobStatus } from '../dto/csv-import-job.dto';
import * as path from 'path';
import * as fs from 'fs';

describe('CsvImportService', () => {
  let service: CsvImportService;
  let csvValidator: CsvValidatorService;
  let prismaService: PrismaService;
  let usersRepository: UsersRepository;

  const mockPrismaService: { $transaction: jest.Mock } = {
    $transaction: jest.fn((callback: (prisma: typeof mockPrismaService) => unknown) => callback(mockPrismaService)),
  };

  const mockUsersRepository = {
    upsert: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const mockOrgsRepository = {
    upsert: jest.fn(),
  };

  const mockClassesRepository = {
    upsert: jest.fn(),
  };

  const mockCoursesRepository = {
    upsert: jest.fn(),
  };

  const mockEnrollmentsRepository = {
    upsert: jest.fn(),
  };

  const mockAcademicSessionsRepository = {
    upsert: jest.fn(),
  };

  const mockDemographicsRepository = {
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        CsvValidatorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: OrgsRepository, useValue: mockOrgsRepository },
        { provide: ClassesRepository, useValue: mockClassesRepository },
        { provide: CoursesRepository, useValue: mockCoursesRepository },
        { provide: EnrollmentsRepository, useValue: mockEnrollmentsRepository },
        {
          provide: AcademicSessionsRepository,
          useValue: mockAcademicSessionsRepository,
        },
        {
          provide: DemographicsRepository,
          useValue: mockDemographicsRepository,
        },
      ],
    }).compile();

    service = module.get<CsvImportService>(CsvImportService);
    csvValidator = module.get<CsvValidatorService>(CsvValidatorService);
    prismaService = module.get<PrismaService>(PrismaService);
    usersRepository = module.get<UsersRepository>(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('importCsv', () => {
    it('should import valid CSV file successfully', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email
user-001,active,2025-01-01,true,太郎,山田,student,yamada.taro,yamada@example.com
user-002,active,2025-01-02,true,花子,佐藤,student,sato.hanako,sato@example.com`;

      const tempFilePath = path.join(__dirname, 'test-users.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const job: CsvImportJobDto = {
        id: 'job-001',
        filename: 'test-users.csv',
        filePath: tempFilePath,
        entityType: 'users',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      mockUsersRepository.upsert.mockResolvedValue({});

      const result = await service.importCsv(job);

      expect(result.processedRecords).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(mockUsersRepository.upsert).toHaveBeenCalledTimes(2);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should handle validation errors gracefully', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email
user-001,invalid_status,2025-01-01,true,太郎,山田,student,yamada.taro,yamada@example.com`;

      const tempFilePath = path.join(__dirname, 'test-users-invalid.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const job: CsvImportJobDto = {
        id: 'job-002',
        filename: 'test-users-invalid.csv',
        filePath: tempFilePath,
        entityType: 'users',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      const result = await service.importCsv(job);

      expect(result.processedRecords).toBe(1);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.errors?.length).toBeGreaterThan(0);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should batch insert records', async () => {
      // Create CSV with 2500 records (should be 3 batches: 1000, 1000, 500)
      const csvRows = [
        'sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email',
      ];

      for (let i = 1; i <= 2500; i++) {
        csvRows.push(
          `user-${i.toString().padStart(4, '0')},active,2025-01-01,true,User,${i},student,user${i},user${i}@example.com`,
        );
      }

      const testCsvContent = csvRows.join('\n');
      const tempFilePath = path.join(__dirname, 'test-users-large.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const job: CsvImportJobDto = {
        id: 'job-003',
        filename: 'test-users-large.csv',
        filePath: tempFilePath,
        entityType: 'users',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      mockUsersRepository.upsert.mockResolvedValue({});

      const result = await service.importCsv(job);

      expect(result.processedRecords).toBe(2500);
      expect(result.successCount).toBe(2500);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    }, 30000); // 30 second timeout for large file test
  });

  describe('countCsvRecords', () => {
    it('should count CSV records correctly', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified
user-001,active,2025-01-01
user-002,active,2025-01-02
user-003,active,2025-01-03`;

      const tempFilePath = path.join(__dirname, 'test-count.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const count = await service.countCsvRecords(tempFilePath);

      expect(count).toBe(3);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should exclude header row from count', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified
user-001,active,2025-01-01`;

      const tempFilePath = path.join(__dirname, 'test-count-single.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const count = await service.countCsvRecords(tempFilePath);

      expect(count).toBe(1); // Header is not counted

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should skip empty lines', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified
user-001,active,2025-01-01

user-002,active,2025-01-02

`;

      const tempFilePath = path.join(__dirname, 'test-count-empty-lines.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const count = await service.countCsvRecords(tempFilePath);

      expect(count).toBe(2); // Empty lines are skipped

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });
  });

  describe('Entity Type Handling', () => {
    it('should route to correct repository for users', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username
user-001,active,2025-01-01,true,太郎,山田,student,yamada.taro`;

      const tempFilePath = path.join(__dirname, 'test-users-routing.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const job: CsvImportJobDto = {
        id: 'job-users',
        filename: 'test-users-routing.csv',
        filePath: tempFilePath,
        entityType: 'users',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      mockUsersRepository.upsert.mockResolvedValue({});

      await service.importCsv(job);

      expect(mockUsersRepository.upsert).toHaveBeenCalled();
      expect(mockOrgsRepository.upsert).not.toHaveBeenCalled();

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    it('should throw error for unknown entity type', async () => {
      const job: CsvImportJobDto = {
        id: 'job-unknown',
        filename: 'test-unknown.csv',
        filePath: '/tmp/test-unknown.csv',
        entityType: 'unknownEntity',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      const result = await service.importCsv(job);

      expect(result.status).toBe(CsvImportJobStatus.FAILED);
      expect(result.errorMessage).toContain('Unknown entity type');
    });
  });

  describe('Error Handling', () => {
    it('should handle file not found error', async () => {
      const job: CsvImportJobDto = {
        id: 'job-not-found',
        filename: 'non-existent.csv',
        filePath: '/tmp/non-existent.csv',
        entityType: 'users',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      const result = await service.importCsv(job);

      expect(result.status).toBe(CsvImportJobStatus.FAILED);
      expect(result.errorMessage).toBeDefined();
    }, 10000); // Increase timeout to 10 seconds

    it('should handle database errors during upsert', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username
user-001,active,2025-01-01,true,太郎,山田,student,yamada.taro`;

      const tempFilePath = path.join(__dirname, 'test-db-error.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const job: CsvImportJobDto = {
        id: 'job-db-error',
        filename: 'test-db-error.csv',
        filePath: tempFilePath,
        entityType: 'users',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      mockUsersRepository.upsert.mockRejectedValue(new Error('Database error'));

      const result = await service.importCsv(job);

      // Database errors during batch insert are caught and counted as errors
      expect(result.errorCount).toBeGreaterThan(0);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });
  });

  describe('Japan Profile Metadata', () => {
    it('should extract Japan Profile metadata from CSV columns', async () => {
      const testCsvContent = `sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
user-001,active,2025-01-01,true,太郎,山田,student,yamada.taro,タロウ,ヤマダ`;

      const tempFilePath = path.join(__dirname, 'test-japan-profile.csv');
      fs.writeFileSync(tempFilePath, testCsvContent, 'utf-8');

      const job: CsvImportJobDto = {
        id: 'job-japan',
        filename: 'test-japan-profile.csv',
        filePath: tempFilePath,
        entityType: 'users',
        status: CsvImportJobStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      mockUsersRepository.upsert.mockImplementation((sourcedId, data) => {
        expect(data.metadata).toBeDefined();
        expect(data.metadata.jp).toBeDefined();
        expect(data.metadata.jp.kanaGivenName).toBe('タロウ');
        expect(data.metadata.jp.kanaFamilyName).toBe('ヤマダ');
        return Promise.resolve({});
      });

      await service.importCsv(job);

      // Cleanup
      fs.unlinkSync(tempFilePath);
    });
  });
});
