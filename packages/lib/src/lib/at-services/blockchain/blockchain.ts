import {
  Chain,
  ClusterDepositTransaction,
  CreateEvmTransactionDto,
  CreateSubstrateTransactionDto,
  TransactionDto,
  UpdateTransactionDto,
  WalletDepositsQueryFilter,
  WalletTransactionsQueryFilter,
} from '../../..';
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

  public async createOasisSignature(params: {
    data: string;
    timestamp: number;
  }): Promise<{
    data: { dataHash: string; signature: string; gasPrice: string };
  }> {
    const data = {
      eventName: BlockchainEventType.CREATE_OASIS_SIGNATURE,
      ...params,
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

  public async getWallets(chain: Chain, chainType: ChainType) {
    return await this.callService({
      eventName: BlockchainEventType.GET_WALLETS,
      chain,
      chainType,
    });
  }

  public async getWallet(walletId: number) {
    return await this.callService({
      eventName: BlockchainEventType.GET_WALLET,
      walletId,
    });
  }

  public async updateWallet(walletId: number, data: any) {
    return await this.callService({
      eventName: BlockchainEventType.UPDATE_WALLET,
      walletId,
      data,
    });
  }

  public async getWalletTransactions(
    query: WalletTransactionsQueryFilter,
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

  public async listWalletDeposits(query: WalletDepositsQueryFilter) {
    return await this.callService({
      eventName: BlockchainEventType.LIST_WALLET_DEPOSITS,
      ...query,
    });
  }
  //#endregion

  //#region computing on phala

  public async getPhalaClusterDepositTransaction(
    clusterDepositTransaction: ClusterDepositTransaction,
  ) {
    const data = {
      eventName: BlockchainEventType.GET_PHALA_CLUSTER_DEPOSIT_TRANSACTION,
      clusterDepositTransaction,
    };
    return await this.callService(data);
  }

  public async getTotalWalletTransactions() {
    return await this.callService({
      eventName: BlockchainEventType.GET_TOTAL_WALLET_TRANSACTIONS,
    });
  }
  //#endregion

  //#region contracts

  public async listContracts(filter: BaseQueryFilter) {
    return await this.callService({
      eventName: BlockchainEventType.LIST_CONTRACTS,
      ...filter,
    });
  }

  public async getContract(contractId: number) {
    return await this.callService({
      eventName: BlockchainEventType.GET_CONTRACT,
      contractId,
    });
  }
  //#endregion
}
