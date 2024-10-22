import {
  BaseQueryFilter,
  CreateMultisigWalletRequestDto,
  DefaultUserRole,
  PopulateFrom,
  SqlModelStatus,
  TransmitMultiSigRequest,
  UpdateTransactionDto,
  ValidateFor,
  WalletDepositsQueryFilter,
  WalletRefillTransactionQueryFilter,
  WalletTransactionsQueryFilter,
} from '@apillon/lib';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { DevConsoleApiContext } from '../../../context';
import { BlockchainService } from './blockchain.service';
import { BaseQueryFilterValidator } from '../../../decorators/base-query-filter-validator';
import { ValidationGuard } from '../../../guards/validation.guard';
import { RefillWalletDto } from '@apillon/blockchain-lib/common';

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
    @Body() data: { minBalance: string; status: SqlModelStatus },
  ) {
    return this.blockchainService.updateWallet(context, walletId, data);
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

  @Get('wallets/:id/deposits')
  @Validation({
    dto: WalletDepositsQueryFilter,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async listWalletDeposits(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: WalletDepositsQueryFilter,
    @Param('id', ParseIntPipe) walletId: number,
  ) {
    return this.blockchainService.listWalletDeposits(context, query, walletId);
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

  @Post('wallets/:id/refill')
  @Validation({
    dto: RefillWalletDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async refillWallet(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') walletId: number,
    @Body() body: RefillWalletDto,
  ) {
    body.walletId = walletId;
    return await this.blockchainService.refillWallet(context, body);
  }

  @Get('multisig-wallets')
  @Validation({
    dto: BaseQueryFilter,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async listMultisigWallet(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: BaseQueryFilter,
  ) {
    return await this.blockchainService.listMultisigWallets(context, body);
  }

  @Get('multisig-wallets/:id')
  async getMultisigWallet(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') walletId: number,
  ) {
    return await this.blockchainService.getMultisigWallet(context, walletId);
  }

  @Post('multisig-wallets')
  @Validation({
    dto: CreateMultisigWalletRequestDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async createMultisigWallet(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateMultisigWalletRequestDto,
  ) {
    return await this.blockchainService.createMultisigWallet(context, body);
  }

  // TODO: remove methods bellow after testing
  @Post('wallets/:id/multisig/transmit')
  @Validation({
    dto: TransmitMultiSigRequest,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async transmitMultiSigTransaction(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') walletId: number,
    @Body() body: TransmitMultiSigRequest,
  ) {
    body.signerWalletId = walletId;
    return await this.blockchainService.transmitMultiSigTransaction(
      context,
      body,
    );
  }

  @Post('wallets/:id/multisig/cancel')
  @Validation({
    dto: TransmitMultiSigRequest,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async cancelMultiSigTransaction(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') walletId: number,
    @Body() body: TransmitMultiSigRequest,
  ) {
    body.signerWalletId = walletId;
    return await this.blockchainService.cancelMultiSigTransaction(
      context,
      body,
    );
  }

  @Get('wallets/:id/refill/transactions')
  @Validation({
    dto: WalletRefillTransactionQueryFilter,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async listWalletRefillTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') walletId: number,
    @Body() body: WalletRefillTransactionQueryFilter,
  ) {
    body.refId = walletId;
    return await this.blockchainService.listWalletRefillTransactions(
      context,
      body,
    );
  }
}
