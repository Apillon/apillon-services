import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';

@Module({
  imports: [],
  controllers: [BlockchainController],
  providers: [BlockchainService],
})
export class BlockchainModule {}
