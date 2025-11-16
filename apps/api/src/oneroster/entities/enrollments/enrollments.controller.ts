import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { QueryEnrollmentsDto } from './dto/query-enrollments.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

@ApiTags('enrollments')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/enrollments')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all enrollments' })
  @ApiResponse({ status: 200, type: [EnrollmentResponseDto] })
  async findAll(@Query() query: QueryEnrollmentsDto) {
    return this.enrollmentsService.findAll(query);
  }

  @Get(':sourcedId')
  @ApiOperation({ summary: 'Get enrollment by sourcedId' })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async findOne(@Param('sourcedId') sourcedId: string): Promise<EnrollmentResponseDto> {
    return this.enrollmentsService.findOne(sourcedId);
  }
}
