import { Module } from '@nestjs/common';
import { ProductHuntController } from './product-hunt.controller';
import { ProductHuntService } from './product-hunt.service';

@Module({
  controllers: [ProductHuntController],
  providers: [ProductHuntService],
})
export class ProductHuntModule {}
