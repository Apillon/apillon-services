import { Ctx } from '@apillon/modules-lib';
import { Controller, Get, Post, Query } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticationApiContext } from '../../../context';
import { SporranService } from './sporran.service';

@Controller('sporran')
export class SporranController {
  constructor(private sporranService: SporranService) {}

  @Get('session/values')
  async sporranGetChallange(@Ctx() context: AuthenticationApiContext) {
    return await this.sporranService.getSessionValues(context);
  }

  @Post('session/verify-challenge')
  async sporranVerifySession(@Ctx() context: AuthenticationApiContext) {
    return await this.sporranService.getSessionValues(context);
  }
}
