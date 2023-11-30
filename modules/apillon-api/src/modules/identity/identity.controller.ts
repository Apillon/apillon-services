import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import {
  DefaultApiKeyRole,
  AttachedServiceType,
  WalletIdentityDto,
} from '@apillon/lib';
import { ApiKeyPermissions, Validation, Ctx } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('identity')
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Post(':wallet_address')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.AUTHENTICATION,
  })
  @Validation({ dto: WalletIdentityDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async getWalletIdentity(
    @Ctx() context: ApillonApiContext,
    @Param('wallet_address') wallet_address: string,
    @Body() body: WalletIdentityDto,
  ) {
    body.walletAddress = wallet_address;
    return await this.identityService.getWalletIdentity(context, body);
  }
}
