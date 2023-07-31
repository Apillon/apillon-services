import {
  DefaultUserRole,
  BaseQueryFilter,
  UpdateTransactionDto,
  ValidateFor,
  PopulateFrom,
} from '@apillon/lib';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { DevConsoleApiContext } from '../../../context';
import { BlockchainService } from './blockchain.service';
import { BaseQueryFilterValidator } from '../../../decorators/base-query-filter-validator';
import { ValidationGuard } from '../../../guards/validation.guard';
import { WalletTransactionsQueryFilter } from '@apillon/lib';

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

  @Patch('wallets/:id')
  async updateWallet(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) walletId: number,
    @Body() updateWalletDto: any,
  ) {
    return this.blockchainService.updateWallet(
      context,
      walletId,
      updateWalletDto,
    );
  }

  @Get('wallets/:id/transactions')
  @Validation({
    dto: WalletTransactionsQueryFilter,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async getWalletTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: WalletTransactionsQueryFilter,
    @Param('id', ParseIntPipe) walletId: number,
  ) {
    return this.blockchainService.getWalletTransactions(
      context,
      query,
      walletId,
    );
  }

  @Patch('wallets/:id/transactions/:tid')
  @Validation({
    dto: UpdateTransactionDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async updateTransaction(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) walletId: number,
    @Param('tid', ParseIntPipe) transactionId: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.blockchainService.updateTransaction(
      context,
      walletId,
      transactionId,
      updateTransactionDto,
    );
  }
}
