import { Module } from '@nestjs/common';
import { ComputingController } from './computing.controller';
import { ComputingService } from './computing.service';
import { ServicesService } from '../services/services.service';

@Module({
  controllers: [ComputingController],
  providers: [ComputingService, ServicesService],
})
export class ComputingModule {}
