import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { CommonModule } from '../../../common/common.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ClassesRepository } from './classes.repository';

/**
 * Classes Module
 *
 * Provides class entity operations for OneRoster Japan Profile.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ClassesController],
  providers: [ClassesService, ClassesRepository],
  exports: [ClassesService],
})
export class ClassesModule {}
