import { Module } from '@nestjs/common';
import { ServicesService } from '../services/services.service';
import { BucketController } from './bucket.controller';
import { BucketService } from './bucket.service';

@Module({
  controllers: [BucketController],
  providers: [BucketService, ServicesService],
})
export class BucketModule {}
