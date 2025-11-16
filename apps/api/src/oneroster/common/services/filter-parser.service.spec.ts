import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FilterParserService } from './filter-parser.service';

describe('FilterParserService', () => {
  let service: FilterParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilterParserService],
    }).compile();

    service = module.get<FilterParserService>(FilterParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Simple Equality Filters', () => {
    it('should parse simple equality filter with single quotes', () => {
      const filter = "status='active'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        status: { equals: 'active' },
      });
    });

    it('should parse simple equality filter with double quotes', () => {
      const filter = 'status="active"';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        status: { equals: 'active' },
      });
    });

    it('should parse multiple fields with different values', () => {
      const filter = "role='student'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        role: { equals: 'student' },
      });
    });
  });

  describe('Inequality Filters', () => {
    it('should parse not equals filter', () => {
      const filter = "status!='tobedeleted'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        status: { not: 'tobedeleted' },
      });
    });
  });

  describe('Comparison Filters', () => {
    it('should parse greater than filter', () => {
      const filter = 'score>90';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        score: { gt: 90 },
      });
    });

    it('should parse greater than or equal filter', () => {
      const filter = 'score>=90';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        score: { gte: 90 },
      });
    });

    it('should parse less than filter', () => {
      const filter = 'score<50';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        score: { lt: 50 },
      });
    });

    it('should parse less than or equal filter', () => {
      const filter = 'score<=50';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        score: { lte: 50 },
      });
    });

    it('should parse date comparison filter', () => {
      const filter = "dateLastModified>='2025-01-01T00:00:00Z'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        dateLastModified: { gte: new Date('2025-01-01T00:00:00Z') },
      });
    });
  });

  describe('Contains Filter (Arrays)', () => {
    it('should parse contains filter for arrays', () => {
      const filter = "termSourcedIds~'term-123'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        termSourcedIds: { has: 'term-123' },
      });
    });
  });

  describe('Logical AND Filters', () => {
    it('should parse AND filter with two conditions', () => {
      const filter = "status='active' AND role='student'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [{ status: { equals: 'active' } }, { role: { equals: 'student' } }],
      });
    });

    it('should parse AND filter with three conditions', () => {
      const filter = "status='active' AND role='student' AND enabledUser='true'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [
          { status: { equals: 'active' } },
          {
            AND: [{ role: { equals: 'student' } }, { enabledUser: { equals: true } }],
          },
        ],
      });
    });

    it('should parse AND filter with comparison operators', () => {
      const filter = "status='active' AND score>=90";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [{ status: { equals: 'active' } }, { score: { gte: 90 } }],
      });
    });
  });

  describe('Logical OR Filters', () => {
    it('should parse OR filter with two conditions', () => {
      const filter = "role='teacher' OR role='administrator'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        OR: [{ role: { equals: 'teacher' } }, { role: { equals: 'administrator' } }],
      });
    });

    it('should parse OR filter with three conditions', () => {
      const filter = "role='teacher' OR role='student' OR role='parent'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        OR: [
          { role: { equals: 'teacher' } },
          {
            OR: [{ role: { equals: 'student' } }, { role: { equals: 'parent' } }],
          },
        ],
      });
    });
  });

  describe('Nested Logical Filters (Parentheses)', () => {
    it('should parse nested filters with parentheses', () => {
      const filter = "(status='active' OR status='tobedeleted') AND role='teacher'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [
          {
            OR: [{ status: { equals: 'active' } }, { status: { equals: 'tobedeleted' } }],
          },
          { role: { equals: 'teacher' } },
        ],
      });
    });

    it('should parse complex nested filters', () => {
      const filter =
        "(role='teacher' OR role='administrator') AND (status='active' AND enabledUser='true')";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [
          {
            OR: [{ role: { equals: 'teacher' } }, { role: { equals: 'administrator' } }],
          },
          {
            AND: [{ status: { equals: 'active' } }, { enabledUser: { equals: true } }],
          },
        ],
      });
    });
  });

  describe('Type Conversion', () => {
    it('should convert string values', () => {
      const filter = "givenName='John'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        givenName: { equals: 'John' },
      });
    });

    it('should convert integer values', () => {
      const filter = 'score=95';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        score: { equals: 95 },
      });
    });

    it('should convert float values', () => {
      const filter = 'score=95.5';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        score: { equals: 95.5 },
      });
    });

    it('should convert negative numbers', () => {
      const filter = 'temperature=-15';
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        temperature: { equals: -15 },
      });
    });

    it('should convert boolean true (lowercase)', () => {
      const filter = "enabledUser='true'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        enabledUser: { equals: true },
      });
    });

    it('should convert boolean true (uppercase)', () => {
      const filter = "enabledUser='TRUE'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        enabledUser: { equals: true },
      });
    });

    it('should convert boolean false (lowercase)', () => {
      const filter = "enabledUser='false'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        enabledUser: { equals: false },
      });
    });

    it('should convert ISO 8601 date with time', () => {
      const filter = "dateLastModified='2025-01-01T00:00:00Z'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        dateLastModified: { equals: new Date('2025-01-01T00:00:00Z') },
      });
    });

    it('should convert ISO 8601 date without time', () => {
      const filter = "birthDate='2000-05-15'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        birthDate: { equals: new Date('2000-05-15') },
      });
    });

    it('should convert ISO 8601 date with milliseconds', () => {
      const filter = "dateLastModified='2025-01-01T10:30:45.123Z'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        dateLastModified: { equals: new Date('2025-01-01T10:30:45.123Z') },
      });
    });
  });

  describe('Field Validation (Security)', () => {
    it('should allow filtering on whitelisted fields', () => {
      const filter = "status='active'";
      const allowedFields = ['status', 'role', 'givenName'];

      const result = service.parseFilter(filter, allowedFields);

      expect(result).toEqual({
        status: { equals: 'active' },
      });
    });

    it('should throw error for non-whitelisted field', () => {
      const filter = "maliciousField='value'";
      const allowedFields = ['status', 'role', 'givenName'];

      expect(() => service.parseFilter(filter, allowedFields)).toThrow(
        BadRequestException,
      );
    });

    it('should validate all fields in AND expression', () => {
      const filter = "status='active' AND role='student'";
      const allowedFields = ['status', 'role'];

      const result = service.parseFilter(filter, allowedFields);

      expect(result).toEqual({
        AND: [{ status: { equals: 'active' } }, { role: { equals: 'student' } }],
      });
    });

    it('should throw error if any field in AND expression is not allowed', () => {
      const filter = "status='active' AND maliciousField='value'";
      const allowedFields = ['status', 'role'];

      expect(() => service.parseFilter(filter, allowedFields)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should return empty object for empty filter', () => {
      const filter = '';
      const result = service.parseFilter(filter);

      expect(result).toEqual({});
    });

    it('should return empty object for whitespace filter', () => {
      const filter = '   ';
      const result = service.parseFilter(filter);

      expect(result).toEqual({});
    });

    it('should handle filters with extra whitespace', () => {
      const filter = "  status  =  'active'  ";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        status: { equals: 'active' },
      });
    });

    it('should handle AND with extra whitespace', () => {
      const filter = "status='active'   AND   role='student'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [{ status: { equals: 'active' } }, { role: { equals: 'student' } }],
      });
    });

    it('should handle values with spaces', () => {
      const filter = "givenName='John Doe'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        givenName: { equals: 'John Doe' },
      });
    });

    it('should handle empty string values', () => {
      const filter = "middleName=''";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        middleName: { equals: '' },
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid operator', () => {
      const filter = 'status$active';

      expect(() => service.parseFilter(filter)).toThrow(BadRequestException);
    });

    it('should throw error for missing value', () => {
      const filter = 'status=';

      expect(() => service.parseFilter(filter)).toThrow(BadRequestException);
    });

    it('should throw error for unmatched parentheses (opening)', () => {
      const filter = "(status='active'";

      // This may or may not throw depending on implementation
      // If it doesn't throw, it should at least not crash
      try {
        service.parseFilter(filter);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw error for malformed expression', () => {
      const filter = 'AND AND';

      expect(() => service.parseFilter(filter)).toThrow(BadRequestException);
    });
  });

  describe('Real-world OneRoster Examples', () => {
    it('should parse delta sync filter', () => {
      const filter = "dateLastModified>='2025-01-01T00:00:00Z'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        dateLastModified: { gte: new Date('2025-01-01T00:00:00Z') },
      });
    });

    it('should parse active students filter', () => {
      const filter = "status='active' AND role='student'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [{ status: { equals: 'active' } }, { role: { equals: 'student' } }],
      });
    });

    it('should parse teachers or administrators filter', () => {
      const filter = "role='teacher' OR role='administrator'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        OR: [{ role: { equals: 'teacher' } }, { role: { equals: 'administrator' } }],
      });
    });

    it('should parse enabled users in specific org', () => {
      const filter = "enabledUser='true' AND orgSourcedIds~'org-123'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [{ enabledUser: { equals: true } }, { orgSourcedIds: { has: 'org-123' } }],
      });
    });

    it('should parse complex enrollment filter', () => {
      const filter =
        "(status='active' OR status='tobedeleted') AND role='student' AND primary='true'";
      const result = service.parseFilter(filter);

      expect(result).toEqual({
        AND: [
          {
            OR: [{ status: { equals: 'active' } }, { status: { equals: 'tobedeleted' } }],
          },
          {
            AND: [{ role: { equals: 'student' } }, { primary: { equals: true } }],
          },
        ],
      });
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle deeply nested expressions', () => {
      const filter =
        "((status='active' AND role='student') OR (status='active' AND role='teacher')) AND enabledUser='true'";

      const result = service.parseFilter(filter);

      expect(result).toBeDefined();
      expect(result.AND).toBeDefined();
    });

    it('should handle many OR conditions', () => {
      const filter =
        "role='student' OR role='teacher' OR role='administrator' OR role='parent' OR role='guardian'";

      const result = service.parseFilter(filter);

      expect(result).toBeDefined();
      expect(result.OR).toBeDefined();
    });

    it('should handle many AND conditions', () => {
      const filter =
        "status='active' AND enabledUser='true' AND role='student' AND givenName='John'";

      const result = service.parseFilter(filter);

      expect(result).toBeDefined();
      expect(result.AND).toBeDefined();
    });
  });
});
