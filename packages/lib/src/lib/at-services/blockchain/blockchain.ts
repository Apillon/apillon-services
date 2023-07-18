import { env } from '../../../config/env';
import {
  AppEnvironment,
  BlockchainEventType,
  ChainType,
  EvmChain,
  SubstrateChain,
} from '../../../config/types';
import { BaseQueryFilter } from '../../base-models/base-query-filter.model';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import {
  UpdateTransactionDto,
  UpdateWalletDto,
  CreateEvmTransactionDto,
  CreateSubstrateTransactionDto,
  TransactionDto,
  GetWalletTransactionsDto,
} from '../../..';

export class BlockchainMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.BLOCKCHAIN_FUNCTION_NAME_TEST
      : env.BLOCKCHAIN_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.BLOCKCHAIN_SOCKET_PORT_TEST
      : env.BLOCKCHAIN_SOCKET_PORT;
  serviceName = 'BLOCKCHAIN';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  //#region substrate transactions

  public async createSubstrateTransaction(
    params: CreateSubstrateTransactionDto,
  ): Promise<{ data: TransactionDto }> {
    const data = {
      eventName: BlockchainEventType.SUBSTRATE_SIGN_TRANSACTION,
      params: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getSubstrateTransaction(id: number) {
    const data = {
      eventName: BlockchainEventType.SUBSTRATE_GET_TRANSACTION,
      id,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region evm transactions

  public async createEvmTransaction(
    params: CreateEvmTransactionDto,
  ): Promise<{ data: TransactionDto }> {
    const data = {
      eventName: BlockchainEventType.EVM_SIGN_TRANSACTION,
      params: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getEvmTransaction(id: number) {
    const data = {
      eventName: BlockchainEventType.EVM_GET_TRANSACTION,
      id,
    };
    return await this.callService(data);
  }

  //#endregion

  public async getChainEndpoint(
    chain: EvmChain | SubstrateChain,
    chainType: ChainType,
  ): Promise<{ data: { url: string } }> {
    const data = {
      eventName: BlockchainEventType.GET_CHAIN_ENDPOINT,
      chain,
      chainType,
    };
    return await this.callService(data);
  }

  //#region wallet methods

  public async listWallets(filter: BaseQueryFilter) {
    return await this.callService({
      eventName: BlockchainEventType.LIST_WALLETS,
      ...filter,
    });
  }

  public async getWallet(walletId: number) {
    return await this.callService({
      eventName: BlockchainEventType.GET_WALLET,
      walletId,
    });
  }

  public async updateWallet(walletId: number, data: UpdateWalletDto) {
    return await this.callService({
      eventName: BlockchainEventType.UPDATE_WALLET,
      walletId,
      data,
    });
  }

  public async getWalletTransactions(
    query: GetWalletTransactionsDto,
    walletId: number,
  ) {
    return await this.callService({
      eventName: BlockchainEventType.GET_WALLET_TRANSACTIONS,
      walletId,
      ...query,
    });
  }

  public async updateTransaction(
    walletId: number,
    transactionId: number,
    data: UpdateTransactionDto,
  ) {
    return await this.callService({
      eventName: BlockchainEventType.UPDATE_TRANSACTION,
      walletId,
      transactionId,
      data,
    });
  }
  //#endregion
}
