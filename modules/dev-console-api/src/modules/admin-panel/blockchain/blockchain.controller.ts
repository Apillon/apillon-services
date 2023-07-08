import { DefaultUserRole, BaseQueryFilter } from '@apillon/lib';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, Permissions } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { DevConsoleApiContext } from '../../../context';
import { BlockchainService } from './blockchain.service';
import { BaseQueryFilterValidator } from '../../../decorators/base-query-filter-validator';

@Controller('admin-panel/blockchain')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('wallets')
  @BaseQueryFilterValidator()
  async listWallets(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseQueryFilter,
  ) {
    return this.blockchainService.getWalletList(context, query);
  }

  @Get('wallets/:id')
  async getWallet(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) walletId: number,
  ) {
    return this.blockchainService.getWallet(context, walletId);
  }

  @Get('wallets/:id/transactions')
  @BaseQueryFilterValidator()
  async getWalletTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseQueryFilter,
    @Param('id', ParseIntPipe) walletId: number,
  ) {
    return this.blockchainService.getWalletTransactions(context, walletId);
  }
}
