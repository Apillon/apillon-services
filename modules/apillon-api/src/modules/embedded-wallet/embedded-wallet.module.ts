import { Module } from '@nestjs/common';
import { EmbeddedWalletController } from './embedded-wallet.controller';
import { EmbeddedWalletService } from './embedded-wallet.service';

@Module({
  controllers: [EmbeddedWalletController],
  providers: [EmbeddedWalletService],
})
export class EmbeddedWalletModule {}
