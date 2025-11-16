/**
 * Field Mapping Module
 *
 * NestJS module for field mapping configuration
 */

import { Module } from '@nestjs/common';
import { FieldMappingController } from './field-mapping.controller';
import { FieldMappingService } from './field-mapping.service';
import { FieldMappingRepository } from './repositories/field-mapping.repository';
import { TransformationEngineService } from './transformations/transformation-engine.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FieldMappingController],
  providers: [
    FieldMappingService,
    FieldMappingRepository,
    TransformationEngineService,
  ],
  exports: [FieldMappingService, TransformationEngineService],
})
export class FieldMappingModule {}
