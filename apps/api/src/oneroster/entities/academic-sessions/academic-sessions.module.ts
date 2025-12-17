import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { OneRosterCommonModule } from '../../common/oneroster-common.module';
import { AcademicSessionsController } from './academic-sessions.controller';
import { AcademicSessionsService } from './academic-sessions.service';
import { AcademicSessionsRepository } from './academic-sessions.repository';

@Module({
  imports: [DatabaseModule, OneRosterCommonModule],
  controllers: [AcademicSessionsController],
  providers: [AcademicSessionsService, AcademicSessionsRepository],
  exports: [AcademicSessionsService],
})
export class AcademicSessionsModule {}
