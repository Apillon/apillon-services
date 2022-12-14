import { Controller, Post, UseGuards } from '@nestjs/common';
import { DefaultUserRole } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { ReferralService } from './referral.service';
import { Ctx, Permissions } from '@apillon/modules-lib';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('referral')
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @UseGuards(ValidationGuard)
  async createReferral(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.createReferral(context);
  }
}
