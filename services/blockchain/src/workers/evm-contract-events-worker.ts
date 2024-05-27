import {
  AppEnvironment,
  ChainType,
  Context,
  LogType,
  SerializeFor,
  ServiceName,
  env,
  formatTokenWithDecimals,
  formatWalletAddress,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ethers } from 'ethers';
import { Endpoint } from '../common/models/endpoint';
import { BlockchainErrorCode } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { Contract } from '../modules/contract/contract.model';

/**
 * General abstract EVM worker for querying events on given contract. ContractData is stored in db and it's id is given as parameter to the worker
 * Derived workers should declare eventFiler property and implement function processEvents
 */
export abstract class EvmContractEventsWorker extends BaseSingleThreadWorker {
  abstract eventFilter;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(data: any): Promise<any> {
    if (!data.contractId) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    const conn = await this.context.mysql.start();

    try {
      const contractData = await new Contract({}, this.context).populateById(
        data.contractId,
        conn,
        true,
      );
      if (!contractData.exists()) {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.CONTRACT_DOES_NOT_EXISTS,
          status: 500,
          details: data,
        });
      }

      //provider
      const endpoint = await new Endpoint({}, this.context).populateByChain(
        contractData.chain,
        ChainType.EVM,
      );

      if (!endpoint.exists()) {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.INVALID_CHAIN,
          status: 400,
        });
      }

      const provider = new ethers.providers.JsonRpcProvider(endpoint.url);

      const fromBlock = contractData.lastParsedBlock + 1;
      const currentBlock = (await provider.getBlockNumber()) - 2; // we wait 2 block for confirmation
      let toBlock = fromBlock + contractData.blockParseSize;
      if (toBlock > currentBlock) {
        toBlock = currentBlock;
      }

      const contract = new ethers.Contract(
        contractData.address,
        JSON.parse(contractData.abi),
        provider,
      );

      const events = await contract.queryFilter(
        this.eventFilter,
        fromBlock,
        toBlock,
      );

      console.info(
        `Recieved ${events.length} events for contract ${contractData.address}`,
      );

      await this.processEvents(events);

      //Check balance in cluster and perform alerting, if necessary
      await contractData.checkBalance(provider);

      contractData.lastParsedBlock = toBlock;
      contractData.lastParsedBlockUpdateTime = new Date();
      await contractData.update(SerializeFor.UPDATE_DB, conn);

      await conn.commit();
    } catch (err) {
      await conn.rollback();

      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: `Error in EVM contract events worker for contract ${data.contractId}`,
          service: ServiceName.BLOCKCHAIN,
          err,
          data: {
            error: err,
          },
        },
        LogOutput.NOTIFY_ALERT,
      );

      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        throw err;
      }
    }
  }

  public abstract processEvents(events: any): Promise<any>;
}
