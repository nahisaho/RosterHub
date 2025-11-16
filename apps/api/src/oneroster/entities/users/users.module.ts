import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { CommonModule } from '../../../common/common.module';
import { OneRosterCommonModule } from '../../common/oneroster-common.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

/**
 * Users Module
 *
 * Provides user entity operations for OneRoster Japan Profile.
 * Imports database module, common module (for guards), common services (filter parser, field selection),
 * and exports service for use by other modules.
 */
@Module({
  imports: [DatabaseModule, CommonModule, OneRosterCommonModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
