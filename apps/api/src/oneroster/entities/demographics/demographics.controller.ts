import {
  Controller,
  Get,
  Param,
  Query,
  Put,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { DemographicsService } from './demographics.service';
import { DemographicResponseDto } from './dto/demographic-response.dto';
import { QueryDemographicsDto } from './dto/query-demographics.dto';
import { UpdateDemographicDto } from './dto/update-demographic.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

@ApiTags('demographics')
@ApiSecurity('apiKey')
@Controller('ims/oneroster/v1p2/demographics')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
export class DemographicsController {
  constructor(private readonly demographicsService: DemographicsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all demographics' })
  @ApiResponse({ status: 200, type: [DemographicResponseDto] })
  async findAll(@Query() query: QueryDemographicsDto) {
    return this.demographicsService.findAll(query);
  }

  @Get(':sourcedId')
  @ApiOperation({ summary: 'Get demographic by sourcedId' })
  @ApiResponse({ status: 200, type: DemographicResponseDto })
  @ApiResponse({ status: 404, description: 'Demographic not found' })
  async findOne(
    @Param('sourcedId') sourcedId: string,
  ): Promise<DemographicResponseDto> {
    return this.demographicsService.findOne(sourcedId);
  }

  @Put(':sourcedId')
  @ApiOperation({ summary: 'Update demographic' })
  @ApiResponse({ status: 200, type: DemographicResponseDto })
  @ApiResponse({ status: 404, description: 'Demographic not found' })
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateDemographicDto: UpdateDemographicDto,
  ) {
    const demographic = await this.demographicsService.update(
      sourcedId,
      updateDemographicDto,
    );
    return { demographic };
  }

  @Delete(':sourcedId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete demographic' })
  @ApiResponse({ status: 204, description: 'Demographic deleted successfully' })
  @ApiResponse({ status: 404, description: 'Demographic not found' })
  async delete(@Param('sourcedId') sourcedId: string) {
    await this.demographicsService.delete(sourcedId);
  }
}
