import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  CacheByProject,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import {
  BaseProjectQueryFilter,
  CacheKeyPrefix,
  CacheKeyTTL,
  DefaultPermission,
  OasisSignaturesQueryFilter,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthGuard } from '../../guards/auth.guard';
import { DevConsoleApiContext } from '../../context';
import { WalletService } from './wallet.service';

@Controller('wallet')
@Permissions({ permission: DefaultPermission.WALLET })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('oasis-signatures-count-by-api-key')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  @CacheByProject({
    keyPrefix: CacheKeyPrefix.OASIS_SIGNATURE_STATISTIC,
    ttl: CacheKeyTTL.EXTRA_LONG,
  })
  async oasisSignatureStatistic(
    @Ctx() context: DevConsoleApiContext,
    @Query('project_uuid') project_uuid: string,
  ) {
    return await this.walletService.getOasisSignaturesCountByApiKey(
      context,
      project_uuid,
    );
  }

  @Get('oasis-signatures')
  @Validation({
    dto: OasisSignaturesQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  @CacheByProject({
    keyPrefix: CacheKeyPrefix.OASIS_SIGNATURE_LIST,
    ttl: CacheKeyTTL.EXTRA_LONG,
  })
  async listOasisSignatures(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: OasisSignaturesQueryFilter,
  ) {
    return await this.walletService.listOasisSignatures(context, query);
  }
}
