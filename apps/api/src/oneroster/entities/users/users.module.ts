import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { CommonModule } from '../../../common/common.module';
import { OneRosterCommonModule } from '../../common/oneroster-common.module';
import { UsersController } from './users.controller';
import { UsersEnrollmentsController } from './users-enrollments.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

/**
 * Users Module
 *
 * Provides user entity operations for OneRoster Japan Profile.
 * Imports database module, common module (for guards), common services (filter parser, field selection),
 * and exports service for use by other modules.
 */
@Module({
  imports: [DatabaseModule, CommonModule, OneRosterCommonModule, forwardRef(() => EnrollmentsModule)],
  controllers: [UsersController, UsersEnrollmentsController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
