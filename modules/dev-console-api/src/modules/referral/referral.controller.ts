import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateReferralDto, DefaultUserRole } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { ReferralService } from './referral.service';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('referral')
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Post()
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({ dto: CreateReferralDto })
  async createReferral(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateReferralDto,
  ) {
    return await this.referralService.createReferral(context, body);
  }

  @Get()
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getReferral(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.getReferral(context);
  }

  @Get('tweets')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getTweets(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.getTweets(context);
  }

  @Get('twitter/authenticate')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getTwitterAuthenticationLink(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.getTwitterAuthenticationLink(context);
  }
}
