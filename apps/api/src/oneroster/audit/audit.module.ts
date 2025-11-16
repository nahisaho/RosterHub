import { Module, Global } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { DatabaseModule } from '../../database/database.module';

/**
 * Audit Module
 *
 * Provides comprehensive audit logging functionality for the entire application.
 * This module is marked as Global, so AuditLogRepository is available throughout the app.
 *
 * Features:
 * - Audit log repository for database operations
 * - Audit service for business logic and analytics
 * - Audit controller for querying audit logs via API
 * - Global availability (no need to import in other modules)
 *
 * Requirements Coverage:
 * - FR-AUDIT-001: Comprehensive audit logging
 * - FR-AUDIT-002: Change tracking
 * - NFR-COMP-001: GDPR compliance (access logging)
 * - NFR-COMP-002: 個人情報保護法 compliance
 *
 * @module
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [AuditLogRepository, AuditService],
  controllers: [AuditController],
  exports: [AuditLogRepository, AuditService],
})
export class AuditModule {}
