import { MiddlewareConsumer, Module } from '@nestjs/common';
import { NftsController } from './nfts.controller';
import { NftsService } from './nfts.service';
import { ServicesService } from '../services/services.service';
import { MulterMiddleware } from '../../middlewares/multer.middleware';

@Module({
  controllers: [NftsController],
  providers: [NftsService, ServicesService],
})
export class NftsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MulterMiddleware).forRoutes('/nfts/collections/unique');
  }
}
