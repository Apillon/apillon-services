import { NovaWalletService } from './nova-wallet.service';
import { NovaWalletController } from './nova-wallet.controller';
/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [NovaWalletController],
  providers: [NovaWalletService],
})
export class NovaWalletModule {}
