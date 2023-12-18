/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { NftsController } from './nfts.controller';
import { NftsService } from './nfts.service';

@Module({
  imports: [],
  controllers: [NftsController],
  providers: [NftsService],
})
export class NftsModule {}
