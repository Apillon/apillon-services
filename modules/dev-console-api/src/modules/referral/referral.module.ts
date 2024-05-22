import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [ReferralController],
  providers: [ReferralService],
})
export class ReferralModule {}
