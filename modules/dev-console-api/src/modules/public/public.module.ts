import { PublicService } from './public.service';
import { PublicController } from './public.controller';

import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
