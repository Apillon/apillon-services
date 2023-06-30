/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { W3nAssetsController } from './w3n-assets.controller';
import { W3nAssetsService } from './w3n-assets.service';

@Module({
  imports: [],
  controllers: [W3nAssetsController],
  providers: [W3nAssetsService],
})
export class NovaWalletModule {}
