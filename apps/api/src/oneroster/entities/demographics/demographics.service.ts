import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusType } from '@prisma/client';
import { DemographicsRepository } from './demographics.repository';
import { DemographicResponseDto } from './dto/demographic-response.dto';
import { QueryDemographicsDto } from './dto/query-demographics.dto';
import { UpdateDemographicDto } from './dto/update-demographic.dto';
import { FilterParserService } from '../../common/services/filter-parser.service';
import { FieldSelectionService } from '../../common/services/field-selection.service';

@Injectable()
export class DemographicsService {
  constructor(
    private readonly demographicsRepository: DemographicsRepository,
    private readonly filterParser: FilterParserService,
    private readonly fieldSelection: FieldSelectionService,
  ) {}

  async findAll(query: QueryDemographicsDto) {
    const { limit = 100, offset = 0, filter, sort, status, fields } = query;

    // Parse OneRoster filter to extract individual filters
    let dateLastModified: string | undefined;
    let sex: 'male' | 'female' | 'other' | undefined;
    let filterStatus: StatusType | undefined;
    let birthDateFrom: Date | undefined;
    let birthDateTo: Date | undefined;

    if (filter) {
      // Parse dateLastModified
      const dateMatch = filter.match(/dateLastModified>=([^\s']+|'[^']*')/);
      if (dateMatch) dateLastModified = dateMatch[1].replace(/'/g, '');

      // Parse sex
      const sexMatch = filter.match(/sex\s*=\s*'([^']+)'/);
      if (sexMatch) sex = sexMatch[1] as 'male' | 'female' | 'other';

      // Parse status
      const statusMatch = filter.match(/status\s*=\s*'([^']+)'/);
      if (statusMatch) filterStatus = statusMatch[1] as StatusType;

      // Parse birthDate range
      const birthDateFromMatch = filter.match(/birthDate\s*>=\s*'([^']+)'/);
      if (birthDateFromMatch) birthDateFrom = new Date(birthDateFromMatch[1]);

      const birthDateToMatch = filter.match(/birthDate\s*<=\s*'([^']+)'/);
      if (birthDateToMatch) birthDateTo = new Date(birthDateToMatch[1]);
    }

    const demographics = await this.demographicsRepository.findAllWithFilter({
      dateLastModified,
      status: filterStatus ?? status,
      sex,
      birthDateFrom,
      birthDateTo,
      offset,
      limit,
      orderBy: sort || '-dateLastModified',
    });

    const total = await this.demographicsRepository.count({
      where: {
        ...(dateLastModified && {
          dateLastModified: { gte: new Date(dateLastModified) },
        }),
        ...(filterStatus && { status: filterStatus }),
        ...(status && { status }),
        ...(sex && { sex }),
        ...(birthDateFrom && { birthDate: { gte: birthDateFrom } }),
        ...(birthDateTo && { birthDate: { lte: birthDateTo } }),
      },
    });

    // Convert to DTOs
    let data: any[] = demographics.map(
      (demographic) => new DemographicResponseDto(demographic),
    );

    // Apply field selection if requested
    if (fields) {
      data = data.map((d) => this.fieldSelection.filterEntity(d, fields));
    }

    return {
      demographics: data,
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<DemographicResponseDto> {
    const demographic =
      await this.demographicsRepository.findBySourcedId(sourcedId);
    if (!demographic) {
      throw new NotFoundException(
        `Demographic with sourcedId '${sourcedId}' not found`,
      );
    }
    return new DemographicResponseDto(demographic);
  }

  async update(
    sourcedId: string,
    updateDemographicDto: UpdateDemographicDto,
  ): Promise<DemographicResponseDto> {
    const demographic =
      await this.demographicsRepository.findBySourcedId(sourcedId);

    if (!demographic) {
      throw new NotFoundException(
        `Demographic with sourcedId '${sourcedId}' not found`,
      );
    }

    const updateData: any = {
      ...updateDemographicDto,
      dateLastModified: new Date(),
    };

    // Convert birthDate string to Date if provided
    if (updateDemographicDto.birthDate) {
      updateData.birthDate = new Date(updateDemographicDto.birthDate);
    }

    const updated = await this.demographicsRepository.update(
      sourcedId,
      updateData,
    );
    return new DemographicResponseDto(updated);
  }

  async delete(sourcedId: string): Promise<void> {
    const demographic =
      await this.demographicsRepository.findBySourcedId(sourcedId);

    if (!demographic) {
      throw new NotFoundException(
        `Demographic with sourcedId '${sourcedId}' not found`,
      );
    }

    // Soft delete - set status to tobedeleted
    await this.demographicsRepository.update(sourcedId, {
      status: 'tobedeleted',
      dateLastModified: new Date(),
    });
  }
}
