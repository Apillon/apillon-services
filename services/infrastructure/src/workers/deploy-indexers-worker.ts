// import {
//   AppEnvironment,
//   ChainType,
//   Context,
//   env,
//   EvmChain,
//   LogType,
//   PoolConnection,
//   ServiceName,
//   SqlModelStatus,
//   TransactionStatus,
// } from '@apillon/lib';
// import {
//   BaseSingleThreadWorker,
//   LogOutput,
//   sendToWorkerQueue,
//   WorkerDefinition,
// } from '@apillon/workers-lib';
// import { Transaction } from '../common/models/transaction';
// import { Wallet } from '../modules/wallet/wallet.model';
// import { BlockchainErrorCode, DbTables } from '../config/types';
// import { BlockchainCodeException } from '../lib/exceptions';
// import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
// import {
//   EvmTransfer,
//   EvmTransfers,
// } from '../modules/blockchain-indexers/evm/data-models/evm-transfer';
// import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
// import { WorkerName } from './worker-executor';
// import { Indexer } from '../modules/indexer/models/indexer.model';

// export class DeployIndexerWorker extends BaseSingleThreadWorker {
//   public constructor(workerDefinition: WorkerDefinition, context: Context) {
//     super(workerDefinition, context);
//   }

//   public async runExecutor(data: any): Promise<any> {
//     console.info(`${this.logPrefix} RUN EXECUTOR (DeployIndexerWorker)`);

//     const indexersForDeploy = await new Indexer({}, this.context).getIndexers(
//       SqlModelStatus.DRAFT,
//     );

//     for (const indexer of indexersForDeploy) {
//       try {
//         //Call sqd API and trigger squid deployment

//       } catch (err) {
//       }
//     }
//   }
// }
