import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { EnrollmentResponseDto } from '../enrollments/dto/enrollment-response.dto';
import { QueryEnrollmentsDto } from '../enrollments/dto/query-enrollments.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

/**
 * Users Enrollments Controller
 *
 * OneRoster Japan Profile 1.2.2 REST API for user-related enrollments.
 * Base Path: /ims/oneroster/v1p2/users/:userSourcedId/enrollments
 */
@ApiTags('enrollments')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/users')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
export class UsersEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':userSourcedId/enrollments')
  @ApiOperation({
    summary: 'Get enrollments for a user',
    description: 'Retrieve all enrollments for a specific user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    type: [EnrollmentResponseDto],
  })
  async findEnrollmentsForUser(
    @Param('userSourcedId') userSourcedId: string,
    @Query() query: QueryEnrollmentsDto,
  ) {
    return this.enrollmentsService.findByUser(userSourcedId, query);
  }
}
