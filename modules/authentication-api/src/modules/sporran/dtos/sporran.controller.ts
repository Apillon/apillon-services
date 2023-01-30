import { Ctx } from '@apillon/modules-lib';
import { Controller, Get, Query } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticationApiContext } from '../../../context';
import { SporranService } from './sporran.service';

@Controller('sporran')
export class SporranController {
  constructor(private identityService: SporranService) {}

  @Get('challenge')
  async sporranGetChallange(
    @Ctx() context: AuthenticationApiContext,
    @Query('email') email: string,
  ) {
    return randomUUID();
  }
}
