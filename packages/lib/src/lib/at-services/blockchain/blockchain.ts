import { env } from '../../../config/env';
import {
  AppEnvironment,
  BlockchainEventType,
  ChainType,
  EvmChain,
  SubstrateChain,
} from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateEvmTransactionDto } from './dtos/create-evm-transaction.dto';
import { CreateSubstrateTransactionDto } from './dtos/create-substrate-transaction.dto';
import { TransactionDto } from './dtos/transaction.dto';

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
  ) {
    const data = {
      eventName: BlockchainEventType.SUBSTRATE_SIGN_TRANSACTION,
      params: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getSubstrateTransaction(id: number) {
    const data = {
      eventName: BlockchainEventType.SUBSTRATE_GET_TRANSACTION,
      id: id,
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
      id: id,
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
}
