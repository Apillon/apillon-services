import { Module } from '@nestjs/common';
import { AcurastController } from './acurast.controller';
import { AcurastService } from './acurast.service';
import { ServicesService } from '../services/services.service';

@Module({
  controllers: [AcurastController],
  providers: [AcurastService, ServicesService],
})
export class AcurastModule {}
