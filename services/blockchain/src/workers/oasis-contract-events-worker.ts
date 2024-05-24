import {
  AppEnvironment,
  ChainType,
  Context,
  env,
  EvmChain,
  LogType,
  PoolConnection,
  ServiceName,
  splitArray,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  LogOutput,
  sendToWorkerQueue,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../modules/wallet/wallet.model';
import { BlockchainErrorCode, DbTables } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import {
  EvmTransfer,
  EvmTransfers,
} from '../modules/blockchain-indexers/evm/data-models/evm-transfer';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { WorkerName } from './worker-executor';
import { ethers } from 'ethers';
import { Endpoint } from '../common/models/endpoint';
import { Contract } from '../modules/contract/contract.model';
import { EvmContractEventsWorker } from './evm-contract-events-worker';

export class OasisContractEventsWorker extends EvmContractEventsWorker {
  eventFilter = 'GaslessTransaction';

  public async processEvents(events: any) {
    console.info('Events recieved in OasisContractEventsWorker', events);
    //Parse data from events and send webhook to Authentication MS worker
    const dataHashes: string[] = events.map((x) => x.data);

    const chunks = splitArray(dataHashes, 20);

    for (const chunk of chunks) {
      if (
        env.APP_ENV != AppEnvironment.LOCAL_DEV &&
        env.APP_ENV != AppEnvironment.TEST
      ) {
        await sendToWorkerQueue(
          env.AUTH_AWS_WORKER_SQS_URL,
          'OasisContractEventWorker',
          [
            {
              data: chunk,
            },
          ],
          null,
          null,
        );
      }
    }
  }
}
