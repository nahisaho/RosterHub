/**
 * Metrics Interceptor
 *
 * Automatically collects HTTP request metrics for all API endpoints.
 *
 * Metrics collected:
 * - Request count by method, endpoint, status
 * - Response time by method, endpoint, status
 * - Error tracking
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const startTime = Date.now();
    const method = request.method;
    const endpoint = request.route?.path || request.url;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const status = response.statusCode;

        // Record HTTP request metrics
        this.metricsService.recordHttpRequest(
          method,
          endpoint,
          status,
          duration,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const status = error.status || 500;

        // Record HTTP request metrics for errors
        this.metricsService.recordHttpRequest(
          method,
          endpoint,
          status,
          duration,
        );

        // Record error metric
        const errorType = this.getErrorType(error);
        this.metricsService.recordError(errorType, endpoint);

        throw error;
      }),
    );
  }

  /**
   * Determine error type from exception
   */
  private getErrorType(error: any): string {
    if (error.name === 'ValidationError') return 'validation';
    if (error.name === 'UnauthorizedException') return 'authentication';
    if (error.name === 'ForbiddenException') return 'authorization';
    if (error.name === 'NotFoundException') return 'not_found';
    if (error.name === 'BadRequestException') return 'bad_request';
    if (error.message?.includes('database')) return 'database';
    if (error.message?.includes('timeout')) return 'timeout';
    return 'internal';
  }
}
