import {
  BaseQueryFilter,
  PopulateFrom,
  SerializeFor,
  UpdateTransactionDto,
  WalletTransactionsQueryFilter,
  SqlModelStatus,
  WalletIdentityDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  BlockchainCodeException,
  BlockchainValidationException,
} from '../../lib/exceptions';
import { BlockchainErrorCode } from '../../config/types';
import { TransactionLog } from '../accounting/transaction-log.model';
import { WalletWithBalanceDto } from '../../common/dto/wallet-with-balance.dto';
import { Wallet } from './wallet.model';

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
  ): Promise<WalletWithBalanceDto> {
    const wallet = await new Wallet({}, context).populateById(walletId);
    WalletService.checkExists(wallet);

    const transactionSumData = await new TransactionLog(
      { wallet: wallet.address },
      context,
    ).getTransactionAggregateData();

    return {
      ...wallet.serialize(SerializeFor.ADMIN),
      ...transactionSumData,
      isBelowThreshold: wallet.isBelowThreshold,
    } as WalletWithBalanceDto;
  }

  static async updateWallet(
    {
      walletId,
      data,
    }: {
      walletId: number;
      data: {
        minBalance?: number;
        token?: string;
        decimals?: number;
        status?: SqlModelStatus;
      };
    },
    context: ServiceContext,
  ): Promise<any> {
    const conn = await context.mysql.start();

    try {
      const wallet = await new Wallet({}, context).populateById(walletId, conn);
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
      await wallet.update(SerializeFor.UPDATE_DB, conn);
      await context.mysql.commit(conn);
      return wallet.serialize(SerializeFor.ADMIN);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }
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
    await transaction.update();
    return transaction.serialize(SerializeFor.ADMIN) as TransactionLog;
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
