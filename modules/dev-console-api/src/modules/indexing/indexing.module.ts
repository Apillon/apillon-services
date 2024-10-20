import { Module } from '@nestjs/common';
import { IndexerController } from './indexing.controller';
import { IndexingService } from './indexing.service';
@Module({
  controllers: [IndexerController],
  providers: [IndexingService],
})
export class IndexingModule {}
