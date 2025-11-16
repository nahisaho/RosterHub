import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CourseResponseDto } from './dto/course-response.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

@ApiTags('courses')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/courses')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, type: [CourseResponseDto] })
  async findAll(@Query() query: QueryCoursesDto) {
    return this.coursesService.findAll(query);
  }

  @Get(':sourcedId')
  @ApiOperation({ summary: 'Get course by sourcedId' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('sourcedId') sourcedId: string): Promise<CourseResponseDto> {
    return this.coursesService.findOne(sourcedId);
  }
}
