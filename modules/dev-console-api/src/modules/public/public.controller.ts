import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PublicService } from './public.service';
import {
  CacheInterceptor,
  Cache,
  CaptchaGuard,
  Ctx,
  Validation,
} from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { ContactFormDto } from './dtos/contact-form.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { DevConsoleApiContext } from '../../context';
import { CacheKeyPrefix, CacheKeyTTL } from '@apillon/lib';

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
}
