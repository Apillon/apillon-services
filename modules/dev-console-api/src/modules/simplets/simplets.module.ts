import { Module } from '@nestjs/common';
import { SimpletsController } from './simplets.controller';
import { SimpletsService } from './simplets.service';
import { ServicesService } from '../services/services.service';

@Module({
  controllers: [SimpletsController],
  providers: [SimpletsService, ServicesService],
})
export class SimpletsModule {}
