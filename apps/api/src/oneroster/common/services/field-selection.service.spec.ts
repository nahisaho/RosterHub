import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FieldSelectionService } from './field-selection.service';

describe('FieldSelectionService', () => {
  let service: FieldSelectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldSelectionService],
    }).compile();

    service = module.get<FieldSelectionService>(FieldSelectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseFields', () => {
    it('should parse single field', () => {
      const fields = 'sourcedId';
      const result = service.parseFields(fields);

      expect(result).toEqual({
        sourcedId: true,
      });
    });

    it('should parse multiple fields', () => {
      const fields = 'sourcedId,givenName,familyName,email';
      const result = service.parseFields(fields);

      expect(result).toEqual({
        sourcedId: true,
        givenName: true,
        familyName: true,
        email: true,
      });
    });

    it('should handle fields with spaces', () => {
      const fields = 'sourcedId, givenName, familyName, email';
      const result = service.parseFields(fields);

      expect(result).toEqual({
        sourcedId: true,
        givenName: true,
        familyName: true,
        email: true,
      });
    });

    it('should return undefined for empty string', () => {
      const fields = '';
      const result = service.parseFields(fields);

      expect(result).toBeUndefined();
    });

    it('should return undefined for whitespace only', () => {
      const fields = '   ';
      const result = service.parseFields(fields);

      expect(result).toBeUndefined();
    });

    it('should filter out empty field names', () => {
      const fields = 'sourcedId,,givenName,,familyName';
      const result = service.parseFields(fields);

      expect(result).toEqual({
        sourcedId: true,
        givenName: true,
        familyName: true,
      });
    });
  });

  describe('parseFields with allowedFields validation', () => {
    it('should allow all fields when in whitelist', () => {
      const fields = 'sourcedId,givenName,familyName';
      const allowedFields = ['sourcedId', 'givenName', 'familyName', 'email'];

      const result = service.parseFields(fields, allowedFields);

      expect(result).toEqual({
        sourcedId: true,
        givenName: true,
        familyName: true,
      });
    });

    it('should throw error for non-whitelisted field', () => {
      const fields = 'sourcedId,maliciousField,givenName';
      const allowedFields = ['sourcedId', 'givenName', 'familyName'];

      expect(() => service.parseFields(fields, allowedFields)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error with list of invalid fields', () => {
      const fields = 'sourcedId,field1,field2,givenName';
      const allowedFields = ['sourcedId', 'givenName', 'familyName'];

      expect(() => service.parseFields(fields, allowedFields)).toThrow(
        /field1, field2/,
      );
    });
  });

  describe('filterEntity', () => {
    it('should filter entity to include only selected fields', () => {
      const entity = {
        sourcedId: 'user-001',
        givenName: 'John',
        familyName: 'Doe',
        email: 'john@example.com',
        role: 'student',
        status: 'active',
      };
      const fields = 'sourcedId,givenName,familyName';

      const result = service.filterEntity(entity, fields);

      expect(result).toEqual({
        sourcedId: 'user-001',
        givenName: 'John',
        familyName: 'Doe',
      });
    });

    it('should return full entity if fields is empty', () => {
      const entity = {
        sourcedId: 'user-001',
        givenName: 'John',
        familyName: 'Doe',
      };
      const fields = '';

      const result = service.filterEntity(entity, fields);

      expect(result).toEqual(entity);
    });

    it('should handle missing fields gracefully', () => {
      const entity = {
        sourcedId: 'user-001',
        givenName: 'John',
      };
      const fields = 'sourcedId,givenName,familyName';

      const result = service.filterEntity(entity, fields);

      expect(result).toEqual({
        sourcedId: 'user-001',
        givenName: 'John',
        // familyName is not present, so not included
      });
    });
  });

  describe('filterEntities', () => {
    it('should filter array of entities', () => {
      const entities = [
        {
          sourcedId: 'user-001',
          givenName: 'John',
          familyName: 'Doe',
          email: 'john@example.com',
        },
        {
          sourcedId: 'user-002',
          givenName: 'Jane',
          familyName: 'Smith',
          email: 'jane@example.com',
        },
      ];
      const fields = 'sourcedId,givenName';

      const result = service.filterEntities(entities, fields);

      expect(result).toEqual([
        { sourcedId: 'user-001', givenName: 'John' },
        { sourcedId: 'user-002', givenName: 'Jane' },
      ]);
    });

    it('should return full entities if fields is empty', () => {
      const entities = [
        { sourcedId: 'user-001', givenName: 'John' },
        { sourcedId: 'user-002', givenName: 'Jane' },
      ];
      const fields = '';

      const result = service.filterEntities(entities, fields);

      expect(result).toEqual(entities);
    });
  });

  describe('getAllowedFields', () => {
    it('should return allowed fields for users entity', () => {
      const fields = service.getAllowedFields('users');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('status');
      expect(fields).toContain('dateLastModified');
      expect(fields).toContain('givenName');
      expect(fields).toContain('familyName');
      expect(fields).toContain('email');
      expect(fields).toContain('role');
      expect(fields).toContain('metadata');
    });

    it('should return allowed fields for orgs entity', () => {
      const fields = service.getAllowedFields('orgs');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('status');
      expect(fields).toContain('name');
      expect(fields).toContain('type');
      expect(fields).toContain('parentSourcedId');
    });

    it('should return allowed fields for classes entity', () => {
      const fields = service.getAllowedFields('classes');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('title');
      expect(fields).toContain('classCode');
      expect(fields).toContain('classType');
      expect(fields).toContain('courseSourcedId');
    });

    it('should return allowed fields for courses entity', () => {
      const fields = service.getAllowedFields('courses');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('title');
      expect(fields).toContain('courseCode');
      expect(fields).toContain('orgSourcedId');
    });

    it('should return allowed fields for enrollments entity', () => {
      const fields = service.getAllowedFields('enrollments');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('classSourcedId');
      expect(fields).toContain('userSourcedId');
      expect(fields).toContain('role');
      expect(fields).toContain('primary');
    });

    it('should return allowed fields for academicSessions entity', () => {
      const fields = service.getAllowedFields('academicSessions');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('title');
      expect(fields).toContain('type');
      expect(fields).toContain('startDate');
      expect(fields).toContain('endDate');
      expect(fields).toContain('schoolYear');
    });

    it('should return allowed fields for demographics entity', () => {
      const fields = service.getAllowedFields('demographics');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('birthDate');
      expect(fields).toContain('sex');
    });

    it('should return empty array for unknown entity type', () => {
      const fields = service.getAllowedFields('unknownEntity');

      expect(fields).toEqual([]);
    });
  });

  describe('getFilterableFields', () => {
    it('should return filterable fields for users entity', () => {
      const fields = service.getFilterableFields('users');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('status');
      expect(fields).toContain('role');
      expect(fields).toContain('givenName');
      expect(fields).toContain('familyName');
      expect(fields).toContain('email');
    });

    it('should return filterable fields for orgs entity', () => {
      const fields = service.getFilterableFields('orgs');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('status');
      expect(fields).toContain('name');
      expect(fields).toContain('type');
    });

    it('should not include complex fields (arrays, JSONB)', () => {
      const fields = service.getFilterableFields('users');

      // metadata is JSONB, should not be filterable
      expect(fields).not.toContain('metadata');
    });

    it('should return empty array for unknown entity type', () => {
      const fields = service.getFilterableFields('unknownEntity');

      expect(fields).toEqual([]);
    });
  });

  describe('getSortableFields', () => {
    it('should return sortable fields for users entity', () => {
      const fields = service.getSortableFields('users');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('status');
      expect(fields).toContain('givenName');
      expect(fields).toContain('familyName');
      expect(fields).toContain('email');
      expect(fields).toContain('dateLastModified');
    });

    it('should return sortable fields for orgs entity', () => {
      const fields = service.getSortableFields('orgs');

      expect(fields).toContain('sourcedId');
      expect(fields).toContain('name');
      expect(fields).toContain('type');
    });

    it('should not include complex fields (arrays, JSONB)', () => {
      const fields = service.getSortableFields('users');

      // Arrays and JSONB should not be sortable
      expect(fields).not.toContain('orgSourcedIds');
      expect(fields).not.toContain('grades');
      expect(fields).not.toContain('metadata');
    });

    it('should return empty array for unknown entity type', () => {
      const fields = service.getSortableFields('unknownEntity');

      expect(fields).toEqual([]);
    });
  });

  describe('Integration with Entity Types', () => {
    it('should have different field sets for allowed, filterable, and sortable', () => {
      const allowed = service.getAllowedFields('users');
      const filterable = service.getFilterableFields('users');
      const sortable = service.getSortableFields('users');

      // Allowed should be the largest set
      expect(allowed.length).toBeGreaterThanOrEqual(filterable.length);
      expect(allowed.length).toBeGreaterThanOrEqual(sortable.length);

      // All filterable fields should be in allowed
      filterable.forEach((field) => {
        expect(allowed).toContain(field);
      });

      // All sortable fields should be in allowed
      sortable.forEach((field) => {
        expect(allowed).toContain(field);
      });
    });

    it('should have consistent field sets across all entity types', () => {
      const entityTypes = [
        'users',
        'orgs',
        'classes',
        'courses',
        'enrollments',
        'academicSessions',
        'demographics',
      ];

      entityTypes.forEach((entityType) => {
        const allowed = service.getAllowedFields(entityType);
        const filterable = service.getFilterableFields(entityType);
        const sortable = service.getSortableFields(entityType);

        // All entities should have sourcedId
        expect(allowed).toContain('sourcedId');
        expect(filterable).toContain('sourcedId');
        expect(sortable).toContain('sourcedId');

        // All entities should have status
        expect(allowed).toContain('status');
        expect(filterable).toContain('status');
        expect(sortable).toContain('status');

        // All entities should have dateLastModified
        expect(allowed).toContain('dateLastModified');
        expect(filterable).toContain('dateLastModified');
        expect(sortable).toContain('dateLastModified');
      });
    });
  });

  describe('Real-world OneRoster Examples', () => {
    it('should parse typical user field selection', () => {
      const fields = 'sourcedId,givenName,familyName,email,role';
      const allowedFields = service.getAllowedFields('users');

      const result = service.parseFields(fields, allowedFields);

      expect(result).toEqual({
        sourcedId: true,
        givenName: true,
        familyName: true,
        email: true,
        role: true,
      });
    });

    it('should parse minimal field selection', () => {
      const fields = 'sourcedId';
      const allowedFields = service.getAllowedFields('users');

      const result = service.parseFields(fields, allowedFields);

      expect(result).toEqual({
        sourcedId: true,
      });
    });

    it('should filter user entity for API response', () => {
      const user = {
        sourcedId: 'user-001',
        status: 'active',
        dateLastModified: new Date('2025-01-01'),
        enabledUser: true,
        givenName: '太郎',
        familyName: '山田',
        email: 'yamada@example.com',
        role: 'student',
        username: 'yamada.taro',
        metadata: { jp: { kanaGivenName: 'タロウ', kanaFamilyName: 'ヤマダ' } },
      };
      const fields = 'sourcedId,givenName,familyName,email';

      const result = service.filterEntity(user, fields);

      expect(result).toEqual({
        sourcedId: 'user-001',
        givenName: '太郎',
        familyName: '山田',
        email: 'yamada@example.com',
      });
    });
  });
});
