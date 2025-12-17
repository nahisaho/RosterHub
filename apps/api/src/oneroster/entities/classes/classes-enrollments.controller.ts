import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { EnrollmentResponseDto } from '../enrollments/dto/enrollment-response.dto';
import { QueryEnrollmentsDto } from '../enrollments/dto/query-enrollments.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

/**
 * Classes Enrollments Controller
 *
 * OneRoster Japan Profile 1.2.2 REST API for class-related enrollments.
 * Base Path: /ims/oneroster/v1p2/classes/:classSourcedId/enrollments
 */
@ApiTags('enrollments')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/classes')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
export class ClassesEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':classSourcedId/enrollments')
  @ApiOperation({
    summary: 'Get enrollments for a class',
    description: 'Retrieve all enrollments for a specific class.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    type: [EnrollmentResponseDto],
  })
  async findEnrollmentsForClass(
    @Param('classSourcedId') classSourcedId: string,
    @Query() query: QueryEnrollmentsDto,
  ) {
    return this.enrollmentsService.findByClass(classSourcedId, query);
  }
}
