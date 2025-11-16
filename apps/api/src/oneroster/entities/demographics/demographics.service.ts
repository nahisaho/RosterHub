import { Injectable, NotFoundException } from '@nestjs/common';
import { DemographicsRepository } from './demographics.repository';
import { DemographicResponseDto } from './dto/demographic-response.dto';
import { QueryDemographicsDto } from './dto/query-demographics.dto';

@Injectable()
export class DemographicsService {
  constructor(private readonly demographicsRepository: DemographicsRepository) {}

  async findAll(query: QueryDemographicsDto) {
    const { limit = 100, offset = 0, filter, sort, status } = query;

    let dateLastModified: string | undefined;
    if (filter) {
      const match = filter.match(/dateLastModified>=(.+?)(?:\s|$)/);
      if (match) dateLastModified = match[1];
    }

    const demographics = await this.demographicsRepository.findAllWithFilter({
      dateLastModified,
      status,
      offset,
      limit,
      orderBy: sort || '-dateLastModified',
    });

    const total = await this.demographicsRepository.count({
      where: {
        ...(dateLastModified && {
          dateLastModified: { gte: new Date(dateLastModified) },
        }),
        ...(status && { status }),
      },
    });

    return {
      demographics: demographics.map((demographic) => new DemographicResponseDto(demographic)),
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<DemographicResponseDto> {
    const demographic = await this.demographicsRepository.findBySourcedId(sourcedId);
    if (!demographic) {
      throw new NotFoundException(`Demographic with sourcedId '${sourcedId}' not found`);
    }
    return new DemographicResponseDto(demographic);
  }
}
