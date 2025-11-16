import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademicSessionsRepository } from './academic-sessions.repository';
import { AcademicSessionResponseDto } from './dto/academic-session-response.dto';
import { QueryAcademicSessionsDto } from './dto/query-academic-sessions.dto';

@Injectable()
export class AcademicSessionsService {
  constructor(private readonly academicSessionsRepository: AcademicSessionsRepository) {}

  async findAll(query: QueryAcademicSessionsDto) {
    const { limit = 100, offset = 0, filter, sort, type, status } = query;

    let dateLastModified: string | undefined;
    if (filter) {
      const match = filter.match(/dateLastModified>=(.+?)(?:\s|$)/);
      if (match) dateLastModified = match[1];
    }

    const sessions = await this.academicSessionsRepository.findAllWithFilter({
      dateLastModified,
      type,
      status,
      offset,
      limit,
      orderBy: sort || '-dateLastModified',
    });

    const total = await this.academicSessionsRepository.count({
      where: {
        ...(dateLastModified && {
          dateLastModified: { gte: new Date(dateLastModified) },
        }),
        ...(type && { type }),
        ...(status && { status }),
      },
    });

    return {
      academicSessions: sessions.map((session) => new AcademicSessionResponseDto(session)),
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<AcademicSessionResponseDto> {
    const session = await this.academicSessionsRepository.findBySourcedId(sourcedId);
    if (!session) {
      throw new NotFoundException(`AcademicSession with sourcedId '${sourcedId}' not found`);
    }
    return new AcademicSessionResponseDto(session);
  }
}
