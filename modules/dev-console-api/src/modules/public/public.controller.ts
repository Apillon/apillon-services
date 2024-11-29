import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PublicService } from './public.service';
import {
  CacheInterceptor,
  Cache,
  CaptchaGuard,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { ContactFormDto } from './dtos/contact-form.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { DevConsoleApiContext } from '../../context';
import {
  CacheKeyPrefix,
  CacheKeyTTL,
  DefaultUserRole,
  MintEmbeddedWalletNftDTO,
} from '@apillon/lib';
import { ServiceStatusQueryFilter } from '../service-status/dtos/service-status-query-filter.dto';
import { ValidateFor } from '@apillon/lib';

@Controller('public')
@UseInterceptors(CacheInterceptor)
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Post('contact-us')
  @UseGuards(CaptchaGuard, ValidationGuard)
  @Validation({ dto: ContactFormDto })
  async sendContactUsEmail(@Body() body: ContactFormDto) {
    return await this.publicService.sendContactUsEmail(body);
  }

  @Get('statistics')
  @Cache({
    keyPrefix: CacheKeyPrefix.PLATFORM_STATISTICS,
    ttl: CacheKeyTTL.EXTRA_LONG,
  })
  async getPlatformStatistics(@Ctx() context: DevConsoleApiContext) {
    return await this.publicService.getPlatformStatistics(context);
  }

  @Get('service-status')
  @Permissions({ role: DefaultUserRole.USER })
  @Validation({ dto: ServiceStatusQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  @Cache({
    keyPrefix: CacheKeyPrefix.SERVICE_STATUS,
    ttl: CacheKeyTTL.EXTRA_LONG * 24, // 1 day,
  })
  async getServiceStatuses(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ServiceStatusQueryFilter,
  ) {
    return await this.publicService.getServiceStatusList(context, query);
  }

  @Post('mint-nft/:collection_uuid')
  @Validation({ dto: MintEmbeddedWalletNftDTO })
  @UseGuards(ValidationGuard)
  async mintNftToEmbeddedWallet(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Body() body: MintEmbeddedWalletNftDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return await this.publicService.mintNftToEmbeddedWallet(context, body);
  }
}
