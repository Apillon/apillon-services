import {
  BaseQueryFilter,
  Chain,
  ChainType,
  CreateMultisigWalletRequestDto,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UpdateTransactionDto,
  WalletDepositsQueryFilter,
  WalletTransactionsQueryFilter,
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
import { WalletDeposit } from '../accounting/wallet-deposit.model';
import { createKeyMulti, encodeAddress } from '@polkadot/util-crypto';
import { MultisigWallet } from './multisigWallet.model';
import { SUBSTRATE_CHAIN_PREFIX_MAP } from '@apillon/blockchain-lib/substrate';

export class WalletService {
  static async listWallets(
    filter: BaseQueryFilter,
    context: ServiceContext,
  ): Promise<{ items: any[]; total: number }> {
    return await new Wallet({}, context).listWallets(filter);
  }

  static async getWallets(
    { chain }: { chain: Chain },
    context: ServiceContext,
  ): Promise<any[]> {
    return await new Wallet({}, context).getWallets(chain);
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
      await wallet.validateOrThrow(BlockchainValidationException);
      await wallet.update(SerializeFor.UPDATE_DB, conn);
      await context.mysql.commit(conn);
      return wallet.serialize(SerializeFor.ADMIN);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }
  }

  static async listWalletTransactions(
    event: any,
    context: ServiceContext,
  ): Promise<any> {
    const wallet = await new Wallet({}, context).populateById(
      event.walletId as number,
    );
    WalletService.checkExists(wallet);

    return await new Wallet({}, context).listTransactions(
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

    await transaction.validateOrThrow(BlockchainValidationException);
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

  static async listWalletDeposits(
    event: WalletDepositsQueryFilter,
    context: ServiceContext,
  ): Promise<any> {
    const wallet = await new Wallet({}, context).populateById(
      event.walletId as number,
    );
    WalletService.checkExists(wallet);

    return await new WalletDeposit({}, context).listDeposits(
      new WalletDepositsQueryFilter(event),
    );
  }

  /**
   * Get total transaction count (sum of lastProcessedNonce) for all wallets
   * @param {null} _event
   * @param {ServiceContext} context
   */
  static async getTotalWalletTransactions(
    _event: null,
    context: ServiceContext,
  ): Promise<number> {
    return new Wallet({}, context).getTotalTransactions();
  }

  static async createMultisigWallet(
    event: { body: CreateMultisigWalletRequestDto },
    context: ServiceContext,
  ) {
    const body = new CreateMultisigWalletRequestDto({}, context).populate(
      event.body,
    );

    const wallets = await new Wallet({}, context).getWallets(
      body.chain,
      ChainType.SUBSTRATE,
    );
    const signerWallet = wallets[0];
    const signers = [signerWallet.address, ...body.otherSigners];
    const payerAddress = encodeAddress(
      createKeyMulti(signers, body.threshold),
      SUBSTRATE_CHAIN_PREFIX_MAP[body.chain],
    );
    const existingMultisigWallets = await new MultisigWallet(
      {},
      context,
    ).getWallets(body.chain, ChainType.SUBSTRATE, payerAddress);
    if (existingMultisigWallets.length > 0) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_THRESHOLD_OR_SIGNERS,
        status: 400,
        errorMessage: `Multisig wallet with address ${payerAddress} already exists.`,
      });
    }

    const multisigWallet = new MultisigWallet({}, context).populate({
      chain: body.chain,
      chainType: ChainType.SUBSTRATE,
      description: body.description,
      address: payerAddress,
      signers,
      threshold: body.threshold,
    });

    return await multisigWallet.insert(SerializeFor.INSERT_DB);
  }

  static async getMultisigWallet(
    event: { walletId: number },
    context: ServiceContext,
  ) {
    const multisigWallet = await new MultisigWallet({}, context).populateById(
      event.walletId,
    );
    if (!multisigWallet.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.MULTISIG_WALLET_NOT_FOUND,
        status: 404,
      });
    }
    return multisigWallet;
  }

  static async listMultisigWallets(
    event: { body: BaseQueryFilter },
    context: ServiceContext,
  ) {
    return new MultisigWallet({}, context).listWallets(event.body);
  }
}
