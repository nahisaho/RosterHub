import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { CommonModule } from '../../../common/common.module';
import { DemographicsController } from './demographics.controller';
import { DemographicsService } from './demographics.service';
import { DemographicsRepository } from './demographics.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [DemographicsController],
  providers: [DemographicsService, DemographicsRepository],
  exports: [DemographicsService],
})
export class DemographicsModule {}
