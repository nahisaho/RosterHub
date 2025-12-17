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
import { ClassesService } from './classes.service';
import { ClassResponseDto } from './dto/class-response.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { UpdateClassDto } from './dto/update-class.dto';
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
  async findOne(
    @Param('sourcedId') sourcedId: string,
  ): Promise<ClassResponseDto> {
    return this.classesService.findOne(sourcedId);
  }

  @Put(':sourcedId')
  @ApiOperation({
    summary: 'Update class by sourcedId',
    description: 'Update an existing class by OneRoster sourcedId.',
  })
  @ApiBody({ type: UpdateClassDto })
  @ApiResponse({
    status: 200,
    description: 'Class updated successfully',
    type: ClassResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateDto: UpdateClassDto,
  ): Promise<ClassResponseDto> {
    return this.classesService.update(sourcedId, updateDto);
  }

  @Delete(':sourcedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete class by sourcedId',
    description: 'Soft delete a class (set status to tobedeleted).',
  })
  @ApiResponse({ status: 204, description: 'Class deleted successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async remove(@Param('sourcedId') sourcedId: string): Promise<void> {
    return this.classesService.remove(sourcedId);
  }
}
