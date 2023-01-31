import { Ctx } from '@apillon/modules-lib';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { SporranService } from './sporran.service';

@Controller('sporran')
export class SporranController {
  constructor(private sporranService: SporranService) {}

  @Get('session-values')
  async sporranGetSessionValues(@Ctx() context: AuthenticationApiContext) {
    return await this.sporranService.getSessionValues(context);
  }

  @Post('verify-session')
  async sporranVerifySession(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.sporranService.verifySession(context, body);
  }
}
