import { Module } from '@nestjs/common';
import { ComputingService } from './computing.service';
import { ComputingController } from './computing.controller';

@Module({
  imports: [],
  controllers: [ComputingController],
  providers: [ComputingService],
})
export class ComputingModule {}
