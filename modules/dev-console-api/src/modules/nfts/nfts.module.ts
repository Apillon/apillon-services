import { Module } from '@nestjs/common';
import { NftsController } from './nfts.controller';
import { NftsService } from './nfts.service';
import { ServicesService } from '../services/services.service';

@Module({
  controllers: [NftsController],
  providers: [NftsService, ServicesService],
})
export class NftsModule {}
