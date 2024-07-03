import { Module } from '@nestjs/common';
import { AcurastController } from './acurast.controller';
import { AcurastService } from './acurast.service';

@Module({
  imports: [],
  controllers: [AcurastController],
  providers: [AcurastService],
})
export class AcurastModule {}
