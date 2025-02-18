import { Module } from '@nestjs/common';
import { IndexerController } from './indexing.controller';
import { IndexingService } from './indexing.service';
import { ServicesService } from '../services/services.service';
@Module({
  controllers: [IndexerController],
  providers: [IndexingService, ServicesService],
})
export class IndexingModule {}
