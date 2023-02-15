import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  controllers: [ReferralController],
  providers: [ReferralService],
})
export class ReferralModule {}
