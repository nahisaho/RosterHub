import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { CommonModule } from '../../../common/common.module';
import { OneRosterCommonModule } from '../../common/oneroster-common.module';
import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';
import { OrgsRepository } from './orgs.repository';

/**
 * Orgs Module
 *
 * Provides organization entity operations for OneRoster Japan Profile.
 * Imports database module, common module (for guards), common services (filter parser, field selection),
 * and exports service for use by other modules.
 */
@Module({
  imports: [DatabaseModule, CommonModule, OneRosterCommonModule],
  controllers: [OrgsController],
  providers: [OrgsService, OrgsRepository],
  exports: [OrgsService],
})
export class OrgsModule {}
