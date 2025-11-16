import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentsRepository } from './enrollments.repository';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { QueryEnrollmentsDto } from './dto/query-enrollments.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly enrollmentsRepository: EnrollmentsRepository) {}

  async findAll(query: QueryEnrollmentsDto) {
    const { limit = 100, offset = 0, filter, sort, role, status } = query;

    let dateLastModified: string | undefined;
    if (filter) {
      const match = filter.match(/dateLastModified>=(.+?)(?:\s|$)/);
      if (match) dateLastModified = match[1];
    }

    const enrollments = await this.enrollmentsRepository.findAllWithFilter({
      dateLastModified,
      role,
      status,
      offset,
      limit,
      orderBy: sort || '-dateLastModified',
    });

    const total = await this.enrollmentsRepository.count({
      where: {
        ...(dateLastModified && {
          dateLastModified: { gte: new Date(dateLastModified) },
        }),
        ...(role && { role }),
        ...(status && { status }),
      },
    });

    return {
      enrollments: enrollments.map((enrollment) => new EnrollmentResponseDto(enrollment)),
      pagination: { limit, offset, total },
    };
  }

  async findOne(sourcedId: string): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentsRepository.findBySourcedId(sourcedId);
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with sourcedId '${sourcedId}' not found`);
    }
    return new EnrollmentResponseDto(enrollment);
  }
}
