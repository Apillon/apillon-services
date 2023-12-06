import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { WalletIdentityService } from './wallet-identity.service';
import {
  DefaultApiKeyRole,
  AttachedServiceType,
  ValidateFor,
  WalletIdentityDto,
} from '@apillon/lib';
import { ApiKeyPermissions, Validation, Ctx } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('wallet-identity')
export class WalletIdentityController {
  constructor(private walletIdentityService: WalletIdentityService) {}

  @Get()
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.AUTHENTICATION,
  })
  @Validation({ dto: WalletIdentityDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getWalletIdentity(
    @Ctx() context: ApillonApiContext,
    @Query() query: WalletIdentityDto,
  ) {
    return await this.walletIdentityService.getWalletIdentity(context, query);
  }
}
