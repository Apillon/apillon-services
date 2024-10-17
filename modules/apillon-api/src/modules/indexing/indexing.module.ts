import { Module } from '@nestjs/common';
import { IndexingController } from './indexing.controller';
import { IndexingService } from './indexing.service';

@Module({
  imports: [],
  controllers: [IndexingController],
  providers: [IndexingService],
})
export class IndexingModule {}
