import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { QueryEnrollmentsDto } from './dto/query-enrollments.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
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
  async findOne(
    @Param('sourcedId') sourcedId: string,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentsService.findOne(sourcedId);
  }

  @Put(':sourcedId')
  @ApiOperation({ summary: 'Update enrollment by sourcedId' })
  @ApiBody({ type: UpdateEnrollmentDto })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateDto: UpdateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentsService.update(sourcedId, updateDto);
  }

  @Delete(':sourcedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete enrollment by sourcedId' })
  @ApiResponse({ status: 204, description: 'Enrollment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async remove(@Param('sourcedId') sourcedId: string): Promise<void> {
    return this.enrollmentsService.remove(sourcedId);
  }
}
