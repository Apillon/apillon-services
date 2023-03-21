import { Module } from '@nestjs/common';
import { SporranController } from './sporran.controller';
import { SporranService } from './sporran.service';

@Module({
  controllers: [SporranController],
  providers: [SporranService],
})
export class SporranModule {}
