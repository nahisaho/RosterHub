import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { OneRosterCommonModule } from '../../common/oneroster-common.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsRepository } from './enrollments.repository';

@Module({
  imports: [DatabaseModule, OneRosterCommonModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, EnrollmentsRepository],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
