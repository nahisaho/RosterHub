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
import { CoursesService } from './courses.service';
import { CourseResponseDto } from './dto/course-response.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
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
  async findOne(
    @Param('sourcedId') sourcedId: string,
  ): Promise<CourseResponseDto> {
    return this.coursesService.findOne(sourcedId);
  }

  @Put(':sourcedId')
  @ApiOperation({ summary: 'Update course by sourcedId' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateDto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.update(sourcedId, updateDto);
  }

  @Delete(':sourcedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course by sourcedId' })
  @ApiResponse({ status: 204, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('sourcedId') sourcedId: string): Promise<void> {
    return this.coursesService.remove(sourcedId);
  }
}
