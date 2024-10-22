import { DefaultUserRole, RefillWalletRequestDto } from '@apillon/lib';
import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Ctx, Permissions } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { DevConsoleApiContext } from '../../../context';
import { AssetManagementService } from './asset-management.service';

@Controller('admin-panel/asset-management')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class AssetManagementController {
  constructor(
    private readonly assetManagementService: AssetManagementService,
  ) {}

  @Post('wallet-refill/transactions/:uuid/confirm')
  async refillWalletConfirm(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') transactionUuid: string,
  ) {
    return await this.assetManagementService.refillWalletConfirm(
      context,
      new RefillWalletRequestDto({}, context).populate({
        transactionUuid,
      }),
    );
  }

  @Post('wallet-refill/transactions/:uuid/cancel')
  async refillWalletCancel(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') transactionUuid: string,
  ) {
    return await this.assetManagementService.refillWalletCancel(
      context,
      new RefillWalletRequestDto({}, context).populate({
        transactionUuid,
      }),
    );
  }
}
