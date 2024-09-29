import { Module } from '@nestjs/common';
import { IndexerController } from './indexer.controller';
import { IndexerService } from './indexer.service';
@Module({
  controllers: [IndexerController],
  providers: [IndexerService],
})
export class IndexerModule {}
