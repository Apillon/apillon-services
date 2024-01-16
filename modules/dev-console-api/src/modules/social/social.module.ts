/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { ServicesService } from '../services/services.service';

@Module({
  controllers: [SocialController],
  providers: [SocialService, ServicesService],
})
export class SocialModule {}
