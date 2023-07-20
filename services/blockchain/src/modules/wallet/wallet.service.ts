import {
  BaseQueryFilter,
  PopulateFrom,
  SerializeFor,
  UpdateWalletDto,
  UpdateTransactionDto,
  WalletTransactionsQueryFilter,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Wallet, WalletWithBalance } from '../../common/models/wallet';
import {
  BlockchainCodeException,
  BlockchainValidationException,
} from '../../lib/exceptions';
import { BlockchainErrorCode } from '../../config/types';
import { TransactionLog } from '../accounting/transaction-log.model';

export class WalletService {
  static async listWallets(
    filter: BaseQueryFilter,
    context: ServiceContext,
  ): Promise<{ items: any[]; total: number }> {
    return await new Wallet({}, context).listWallets(filter);
  }

  static async getWallet(
    { walletId }: { walletId: number },
    context: ServiceContext,
  ): Promise<WalletWithBalance> {
    const wallet = await new Wallet({}, context).populateById(walletId);
    WalletService.checkExists(wallet);

    const balanceData = await wallet.checkBalance();
    // TODO: Round balance amount based on chain?
    return { ...wallet, ...balanceData } as WalletWithBalance;
  }

  static async updateWallet(
    { walletId, data }: { walletId: number; data: UpdateWalletDto },
    context: ServiceContext,
  ): Promise<Wallet> {
    const wallet = await new Wallet({}, context).populateById(walletId);
    WalletService.checkExists(wallet);

    wallet.populate(data, PopulateFrom.ADMIN);
    try {
      await wallet.validate();
    } catch (err) {
      await wallet.handle(err);
      if (!wallet.isValid()) {
        throw new BlockchainValidationException(wallet);
      }
    }
    await wallet.update(SerializeFor.ADMIN);
    return wallet;
  }

  static async getWalletTransactions(
    event: any,
    context: ServiceContext,
  ): Promise<any> {
    const wallet = await new Wallet({}, context).populateById(
      event.walletId as number,
    );
    WalletService.checkExists(wallet);

    return await new Wallet({}, context).getTransactions(
      wallet.address,
      new WalletTransactionsQueryFilter(event),
    );
  }

  static async updateTransaction(
    {
      walletId,
      transactionId,
      data,
    }: { walletId: number; transactionId: number; data: UpdateTransactionDto },
    context: ServiceContext,
  ): Promise<TransactionLog> {
    const wallet = await new Wallet({}, context).populateById(walletId);
    WalletService.checkExists(wallet);

    const transaction = await new TransactionLog({}, context).populateById(
      transactionId,
    );
    if (!transaction.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.TRANSACTION_NOT_FOUND,
        status: 404,
      });
    }

    transaction.populate(data, PopulateFrom.ADMIN);

    try {
      await transaction.validate();
    } catch (err) {
      await transaction.handle(err);
      if (!transaction.isValid()) {
        throw new BlockchainValidationException(transaction);
      }
    }
    await transaction.update(SerializeFor.ADMIN);
    return transaction;
  }

  static checkExists(wallet: Wallet) {
    if (!wallet.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.WALLET_NOT_FOUND,
        status: 404,
      });
    }
  }
}
