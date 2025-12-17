import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { CommonModule } from '../../../common/common.module';
import { OneRosterCommonModule } from '../../common/oneroster-common.module';
import { ClassesController } from './classes.controller';
import { ClassesEnrollmentsController } from './classes-enrollments.controller';
import { ClassesService } from './classes.service';
import { ClassesRepository } from './classes.repository';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

/**
 * Classes Module
 *
 * Provides class entity operations for OneRoster Japan Profile.
 */
@Module({
  imports: [DatabaseModule, OneRosterCommonModule, forwardRef(() => EnrollmentsModule)],
  controllers: [ClassesController, ClassesEnrollmentsController],
  providers: [ClassesService, ClassesRepository],
  exports: [ClassesService],
})
export class ClassesModule {}
