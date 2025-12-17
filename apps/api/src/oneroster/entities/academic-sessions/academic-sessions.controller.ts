import { Controller, Get, Put, Delete, Param, Query, Body, HttpCode, HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { AcademicSessionsService } from './academic-sessions.service';
import { AcademicSessionResponseDto } from './dto/academic-session-response.dto';
import { QueryAcademicSessionsDto } from './dto/query-academic-sessions.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

@ApiTags('academicSessions')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/academicSessions')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
export class AcademicSessionsController {
  constructor(private readonly academicSessionsService: AcademicSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all academic sessions' })
  @ApiResponse({ status: 200, type: [AcademicSessionResponseDto] })
  async findAll(@Query() query: QueryAcademicSessionsDto) {
    return this.academicSessionsService.findAll(query);
  }

  @Get(':sourcedId')
  @ApiOperation({ summary: 'Get academic session by sourcedId' })
  @ApiResponse({ status: 200, type: AcademicSessionResponseDto })
  @ApiResponse({ status: 404, description: 'Academic session not found' })
  async findOne(@Param('sourcedId') sourcedId: string): Promise<AcademicSessionResponseDto> {
    return this.academicSessionsService.findOne(sourcedId);
  }

  @Put(':sourcedId')
  @ApiOperation({ summary: 'Update academic session by sourcedId' })
  @ApiBody({ type: UpdateAcademicSessionDto })
  @ApiResponse({ status: 200, type: AcademicSessionResponseDto })
  @ApiResponse({ status: 404, description: 'Academic session not found' })
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateDto: UpdateAcademicSessionDto,
  ): Promise<AcademicSessionResponseDto> {
    return this.academicSessionsService.update(sourcedId, updateDto);
  }

  @Delete(':sourcedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete academic session by sourcedId' })
  @ApiResponse({ status: 204, description: 'Academic session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Academic session not found' })
  async remove(@Param('sourcedId') sourcedId: string): Promise<void> {
    return this.academicSessionsService.remove(sourcedId);
  }
}
