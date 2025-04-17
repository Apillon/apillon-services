/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { EmbeddedWalletController } from './embedded-wallet.controller';
import { EmbeddedWalletService } from './embedded-wallet.service';
import { ServicesService } from '../services/services.service';

@Module({
  controllers: [EmbeddedWalletController],
  providers: [EmbeddedWalletService, ServicesService],
})
export class EmbeddedWalletModule {}
