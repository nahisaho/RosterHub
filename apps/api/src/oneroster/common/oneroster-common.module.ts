import { Module } from '@nestjs/common';
import { FilterParserService } from './services/filter-parser.service';
import { FieldSelectionService } from './services/field-selection.service';

/**
 * OneRoster Common Module
 *
 * Provides common services for OneRoster API implementation:
 * - Filter parsing (OneRoster filter syntax to Prisma where clauses)
 * - Field selection (Prisma select objects)
 * - Pagination and sorting utilities
 *
 * These services are used by all OneRoster entity controllers to implement
 * the OneRoster v1.2 REST API specification.
 *
 * Requirements Coverage:
 * - FR-API-016~025: Filter, pagination, sorting implementation
 *
 * @module
 */
@Module({
  providers: [FilterParserService, FieldSelectionService],
  exports: [FilterParserService, FieldSelectionService],
})
export class OneRosterCommonModule {}
