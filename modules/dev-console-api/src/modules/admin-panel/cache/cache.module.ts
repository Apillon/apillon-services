import { Module } from '@nestjs/common';
import { CacheController } from './cache.controller';

@Module({
  imports: [],
  controllers: [CacheController],
  providers: [],
})
export class CacheModule {}
