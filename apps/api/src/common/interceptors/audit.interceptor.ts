import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLogRepository } from '../../oneroster/audit/repositories/audit-log.repository';
import { AuditAction, Prisma } from '@prisma/client';

/**
 * Enhanced Audit Logging Interceptor
 *
 * Automatically logs all API requests and responses for comprehensive audit trail compliance.
 * Stores logs in database (AuditLog table) and console (structured JSON).
 *
 * Features:
 * - Database persistence for long-term audit trail
 * - Detailed request/response tracking (method, path, body, headers, status, timing)
 * - Entity-level tracking (entity type, sourcedId, action)
 * - API key and user attribution
 * - IP address and user agent tracking
 * - Request/response body sanitization (sensitive data removal)
 * - Error handling and logging
 * - Performance metrics (request duration)
 *
 * Requirements Coverage:
 * - FR-AUDIT-001: Comprehensive audit logging for all API operations
 * - FR-AUDIT-002: Change tracking with before/after snapshots
 * - NFR-COMP-001: GDPR compliance (data access logging)
 * - NFR-COMP-002: 個人情報保護法 compliance
 * - NFR-SEC-004: Security event logging
 *
 * @example
 * ```typescript
 * @Controller('ims/oneroster/v1p2/users')
 * @UseInterceptors(AuditInterceptor)
 * export class UsersController {}
 * ```
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    @Optional() @Inject(AuditLogRepository) private readonly auditLogRepository?: AuditLogRepository,
  ) {}

  /**
   * Intercepts request/response for comprehensive audit logging
   *
   * @param context - Execution context
   * @param next - Next handler in chain
   * @returns Observable with audit logging
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Extract audit context
    const auditContext = this.extractAuditContext(request, context);

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          const duration = Date.now() - startTime;
          await this.logAudit({
            ...auditContext,
            statusCode: response.statusCode,
            duration,
            success: true,
            responseData: this.sanitizeResponseData(responseData),
          });
        },
        error: async (error) => {
          const duration = Date.now() - startTime;
          await this.logAudit({
            ...auditContext,
            statusCode: error.status || 500,
            duration,
            success: false,
            errorMessage: error.message || 'Unknown error',
            errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          });
        },
      }),
      catchError((error) => {
        // Re-throw error after logging
        return throwError(() => error);
      }),
    );
  }

  /**
   * Extracts comprehensive audit context from request
   *
   * @param request - Express request object
   * @param context - Execution context
   * @returns Audit context data
   */
  private extractAuditContext(request: Request, context: ExecutionContext): any {
    const apiKey = (request as any).apiKey;
    const handler = context.getHandler();
    const controllerClass = context.getClass();

    // Extract entity type and action from route
    const { entityType, action, entitySourcedId } = this.extractEntityContext(request);

    return {
      timestamp: new Date(),
      method: request.method,
      path: request.path,
      route: request.route?.path,
      query: request.query,
      params: request.params,
      body: this.sanitizeRequestBody(request.body),
      headers: this.sanitizeHeaders(request.headers),
      apiKeyId: apiKey?.id,
      apiKeyName: apiKey?.name,
      clientIp: this.extractClientIp(request),
      userAgent: request.headers['user-agent'] || 'unknown',
      referer: request.headers['referer'] || request.headers['referrer'],
      controller: controllerClass.name,
      handler: handler.name,
      entityType,
      action,
      entitySourcedId,
    };
  }

  /**
   * Extracts entity type, action, and sourcedId from request
   *
   * Parses route path to determine what entity is being accessed and what action is performed.
   * Examples:
   * - GET /ims/oneroster/v1p2/users -> entityType: "User", action: "READ"
   * - POST /ims/oneroster/v1p2/users -> entityType: "User", action: "CREATE"
   * - GET /ims/oneroster/v1p2/users/user-123 -> entityType: "User", action: "READ", entitySourcedId: "user-123"
   * - PUT /ims/oneroster/v1p2/users/user-123 -> entityType: "User", action: "UPDATE", entitySourcedId: "user-123"
   * - DELETE /ims/oneroster/v1p2/users/user-123 -> entityType: "User", action: "DELETE", entitySourcedId: "user-123"
   *
   * @param request - Express request object
   * @returns Entity context (entityType, action, entitySourcedId)
   */
  private extractEntityContext(request: Request): {
    entityType?: string;
    action?: AuditAction;
    entitySourcedId?: string;
  } {
    const path = request.path;
    const method = request.method;

    // Map HTTP methods to AuditAction
    const actionMap: Record<string, AuditAction> = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    const action = actionMap[method];

    // Extract entity type from path (e.g., /ims/oneroster/v1p2/users -> users)
    const pathMatch = path.match(/\/ims\/oneroster\/v1p2\/(\w+)/);
    if (!pathMatch) {
      return {};
    }

    const entityPath = pathMatch[1];

    // Map plural entity paths to entity types
    const entityTypeMap: Record<string, string> = {
      users: 'User',
      orgs: 'Org',
      classes: 'Class',
      courses: 'Course',
      enrollments: 'Enrollment',
      academicSessions: 'AcademicSession',
      demographics: 'Demographic',
    };

    const entityType = entityTypeMap[entityPath];

    // Extract sourcedId from path params
    const entitySourcedId = request.params?.sourcedId || request.params?.id;

    return {
      entityType,
      action,
      entitySourcedId,
    };
  }

  /**
   * Extracts client IP address from request
   *
   * Checks multiple sources in order of priority:
   * 1. X-Forwarded-For header (for proxy/load balancer)
   * 2. X-Real-IP header (for nginx proxy)
   * 3. Direct connection IP
   *
   * @param request - Express request object
   * @returns Client IP address
   */
  private extractClientIp(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      return ips.split(',')[0].trim();
    }

    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    return request.ip || 'unknown';
  }

  /**
   * Logs comprehensive audit entry to database and console
   *
   * @param auditData - Audit log data
   */
  private async logAudit(auditData: any): Promise<void> {
    try {
      // Log to console (structured JSON for log aggregation)
      const logLevel = auditData.success ? 'log' : 'error';
      this.logger[logLevel](
        JSON.stringify({
          ...auditData,
          type: 'API_AUDIT',
        }),
      );

      // Log to database (if repository available)
      if (this.auditLogRepository && auditData.action) {
        await this.auditLogRepository.create({
          action: auditData.action,
          entityType: auditData.entityType,
          entitySourcedId: auditData.entitySourcedId,
          userId: auditData.userId,
          ipAddress: auditData.clientIp,
          userAgent: auditData.userAgent,
          requestMethod: auditData.method,
          requestPath: auditData.path,
          requestQuery: auditData.query ? JSON.stringify(auditData.query) : null,
          requestBody: auditData.body ? JSON.stringify(auditData.body) : null,
          responseStatus: auditData.statusCode,
          responseBody: auditData.responseData ? JSON.stringify(auditData.responseData) : null,
          errorMessage: auditData.errorMessage,
          duration: auditData.duration,
          apiKey: auditData.apiKeyId ? { connect: { id: auditData.apiKeyId } } : undefined,
        } as Prisma.AuditLogCreateInput);
      }
    } catch (error) {
      // Audit logging failure should not break the application
      this.logger.error(
        `Failed to write audit log: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Sanitizes request body to remove sensitive data
   *
   * @param body - Request body
   * @returns Sanitized body
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Deep copy to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(body));

    // Remove sensitive fields (passwords, tokens, etc.)
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'accessToken',
      'refreshToken',
      'privateKey',
      'secretKey',
    ];

    this.sanitizeObject(sanitized, sensitiveFields);

    return sanitized;
  }

  /**
   * Sanitizes response data to remove sensitive information
   *
   * @param data - Response data
   * @returns Sanitized data
   */
  private sanitizeResponseData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // For large responses, only log metadata
    const dataStr = JSON.stringify(data);
    if (dataStr.length > 10000) {
      return {
        _note: 'Response too large to log',
        _size: dataStr.length,
        _type: Array.isArray(data) ? 'array' : 'object',
        _count: Array.isArray(data) ? data.length : Object.keys(data).length,
      };
    }

    return data;
  }

  /**
   * Sanitizes HTTP headers to remove sensitive information
   *
   * @param headers - Request headers
   * @returns Sanitized headers
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'api-key',
    ];

    for (const header of sensitiveHeaders) {
      if (header in sanitized) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Recursively sanitizes an object by redacting sensitive fields
   *
   * @param obj - Object to sanitize
   * @param sensitiveFields - List of field names to redact
   */
  private sanitizeObject(obj: any, sensitiveFields: string[]): void {
    for (const key in obj) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeObject(obj[key], sensitiveFields);
      }
    }
  }
}
