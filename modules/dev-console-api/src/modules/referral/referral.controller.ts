import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ConfirmRetweetDto,
  CreateReferralDto,
  DefaultUserRole,
  GithubOauthDto,
  ProductOrderDto,
  TwitterOauthDto,
  ValidateFor,
  BaseQueryFilter,
  CacheKeyPrefix,
  CacheKeyTTL,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { ReferralService } from './referral.service';
import { CacheInterceptor, Ctx, Permissions, Validation,Cache } from '@apillon/modules-lib';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('referral')
@UseInterceptors(CacheInterceptor)
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Post()
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({ dto: CreateReferralDto })
  async createPlayer(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateReferralDto,
  ) {
    return await this.referralService.createPlayer(context, body);
  }

  @Get()
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getPlayer(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.getPlayer(context);
  }

  @Get('products')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({
    dto: BaseQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  async getProducts(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseQueryFilter,
  ) {
    return await this.referralService.getProducts(context, query);
  }

  @Post('product')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({ dto: ProductOrderDto })
  async orderProduct(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ProductOrderDto,
  ) {
    return await this.referralService.orderProduct(context, body);
  }

  @Post('github/link')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({ dto: GithubOauthDto })
  async linkGithub(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: GithubOauthDto,
  ) {
    return await this.referralService.linkGithub(context, body);
  }

  @Post('github/unlink')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async unlinkGithub(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.unlinkGithub(context);
  }

  @Post('twitter/link')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({ dto: TwitterOauthDto })
  async linkTwitter(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: TwitterOauthDto,
  ) {
    return await this.referralService.linkTwitter(context, body);
  }

  @Post('twitter/unlink')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async unlinkTwitter(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.unlinkTwitter(context);
  }

  @Get('twitter/authenticate')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getTwitterAuthenticationLink(
    @Ctx() context: DevConsoleApiContext,
    @Query() query,
  ) {
    return await this.referralService.getTwitterAuthenticationLink(
      context,
      query?.url,
    );
  }

  @Get('twitter/tweets')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getTweets(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.getTweets(context);
  }

  @Post('twitter/confirm')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({ dto: ConfirmRetweetDto })
  async confirmRetweet(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ConfirmRetweetDto,
  ) {
    return await this.referralService.confirmRetweet(context, body);
  }

  @Get('airdrop-tasks')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  @Cache({ keyPrefix: CacheKeyPrefix.AIRDROP_TASKS, ttl: CacheKeyTTL.DEFAULT, byUser: true  })
  async getAirdropTasks(@Ctx() context: DevConsoleApiContext) {
    return await this.referralService.getAirdropTasks(context);
  }
}
