import { Module } from '@nestjs/common';
import { WalletIdentityController } from './wallet-identity.controller';
import { WalletIdentityService } from './wallet-identity.service';

@Module({
  controllers: [WalletIdentityController],
  providers: [WalletIdentityService],
})
export class IdentityModule {}
