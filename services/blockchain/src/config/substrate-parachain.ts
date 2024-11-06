import { env, SubstrateChain } from '@apillon/lib';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/indexer.service';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/indexer.service';
import { PhalaBlockchainIndexer } from '../modules/blockchain-indexers/substrate/phala/indexer.service';
import { SubsocialBlockchainIndexer } from '../modules/blockchain-indexers/substrate/subsocial/indexer.service';
import { AstarSubstrateBlockchainIndexer } from '../modules/blockchain-indexers/substrate/astar/indexer.service';
import { AcurastBlockchainIndexer } from '../modules/blockchain-indexers/substrate/acurast/indexer.service';
import { UniqueBlockchainIndexer } from '../modules/blockchain-indexers/substrate/unique/indexer.service';

// TODO: Maybe move worker name to env, so it can be configurable
export const ParachainConfig = {
  CRUST: {
    id: SubstrateChain.CRUST,
    name: 'CRUST',
    webhookWorkerName: 'UpdateCrustStatusWorker',
    sqsUrl: env.STORAGE_AWS_WORKER_SQS_URL,
    indexer: CrustBlockchainIndexer,
  },
  KILT: {
    id: SubstrateChain.KILT,
    name: 'KILT',
    webhookWorkerName: 'UpdateStateWorker',
    sqsUrl: env.AUTH_AWS_WORKER_SQS_URL,
    indexer: KiltBlockchainIndexer,
  },
  PHALA: {
    id: SubstrateChain.PHALA,
    name: 'PHALA',
    webhookWorkerName: 'TransactionStatusWorker',
    sqsUrl: env.COMPUTING_AWS_WORKER_SQS_URL,
    indexer: PhalaBlockchainIndexer,
  },
  XSOCIAL: {
    id: SubstrateChain.XSOCIAL,
    name: 'XSOCIAL',
    webhookWorkerName: 'TransactionStatusWorker',
    sqsUrl: env.SOCIAL_AWS_WORKER_SQS_URL,
    indexer: SubsocialBlockchainIndexer,
  },
  SUBSOCIAL: {
    id: SubstrateChain.SUBSOCIAL,
    name: 'SUBSOCIAL',
    webhookWorkerName: 'TransactionStatusWorker',
    sqsUrl: env.SOCIAL_AWS_WORKER_SQS_URL,
    indexer: SubsocialBlockchainIndexer,
  },
  ASTAR: {
    id: SubstrateChain.ASTAR,
    name: 'ASTAR',
    webhookWorkerName: 'TransactionStatusWorker',
    sqsUrl: env.NFTS_AWS_WORKER_SQS_URL,
    indexer: AstarSubstrateBlockchainIndexer,
  },
  ACURAST: {
    id: SubstrateChain.ACURAST,
    name: 'ACURAST',
    webhookWorkerName: 'TransactionStatusWorker',
    sqsUrl: env.COMPUTING_AWS_WORKER_SQS_URL,
    indexer: AcurastBlockchainIndexer,
  },
  UNIQUE: {
    id: SubstrateChain.UNIQUE,
    name: 'UNIQUE',
    webhookWorkerName: 'TransactionStatusWorker',
    sqsUrl: env.NFTS_AWS_WORKER_SQS_URL,
    indexer: UniqueBlockchainIndexer,
  },
};
