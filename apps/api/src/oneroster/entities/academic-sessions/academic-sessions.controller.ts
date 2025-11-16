import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AcademicSessionsService } from './academic-sessions.service';
import { AcademicSessionResponseDto } from './dto/academic-session-response.dto';
import { QueryAcademicSessionsDto } from './dto/query-academic-sessions.dto';
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
}
