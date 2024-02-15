import { Module } from '@nestjs/common';
import { ComputingController } from './computing.controller';
import { ComputingService } from './computing.service';

@Module({
  controllers: [ComputingController],
  providers: [ComputingService],
})
export class ComputingModule {}
