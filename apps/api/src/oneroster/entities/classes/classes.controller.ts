import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { ClassResponseDto } from './dto/class-response.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

/**
 * Classes Controller
 *
 * OneRoster Japan Profile 1.2.2 REST API for class entity.
 * Base Path: /ims/oneroster/v1p2/classes
 */
@ApiTags('classes')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/classes')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all classes',
    description: 'Retrieve all classes with pagination and filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Classes retrieved successfully',
    type: [ClassResponseDto],
  })
  async findAll(@Query() query: QueryClassesDto) {
    return this.classesService.findAll(query);
  }

  @Get(':sourcedId')
  @ApiOperation({
    summary: 'Get class by sourcedId',
    description: 'Retrieve a single class by OneRoster sourcedId.',
  })
  @ApiResponse({
    status: 200,
    description: 'Class retrieved successfully',
    type: ClassResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async findOne(@Param('sourcedId') sourcedId: string): Promise<ClassResponseDto> {
    return this.classesService.findOne(sourcedId);
  }
}
