import { ValidateFor } from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import { DidUri } from '@kiltprotocol/types';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { SporranRequestCredentialDto } from './dtos/sporran-request-credential.dto';
import { SporranSessionVerifyDto } from './dtos/sporran-session.dto';
import { SporranService } from './sporran.service';

@Controller('sporran')
export class SporranController {
  constructor(private sporranService: SporranService) {}

  @Get('session-values')
  async sporranGetSessionValues(@Ctx() context: AuthenticationApiContext) {
    return await this.sporranService.getSessionValues(context);
  }

  @Post('verify-session')
  @Validation({
    dto: SporranSessionVerifyDto,
    validateFor: ValidateFor.QUERY,
  })
  async sporranVerifySession(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.sporranService.verifySession(context, body);
  }

  @Get('request-credential')
  @Validation({
    dto: SporranRequestCredentialDto,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard)
  async sporranRequestCredential(
    @Ctx() context: AuthenticationApiContext,
    @Query() encryptionKeyUri: DidUri,
  ) {
    // Requests credential presentation from the visitor of the d-app
    return await this.sporranService.requestCredential(
      context,
      encryptionKeyUri,
    );
  }
}
