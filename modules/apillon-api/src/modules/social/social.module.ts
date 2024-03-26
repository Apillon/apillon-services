import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';

@Module({
  imports: [],
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
