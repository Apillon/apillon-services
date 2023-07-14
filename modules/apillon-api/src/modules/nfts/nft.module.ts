import { Module } from '@nestjs/common';
import { NftController } from './nft.controller';
import { NftService } from './nft.service';

@Module({
  controllers: [NftController],
  providers: [NftService],
})
export class NftModule {}
