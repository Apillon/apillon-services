import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ServicesService } from '../services/services.service';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, ServicesService],
})
export class ContractsModule {}
