import { SubstrateChain, env } from '@apillon/lib';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/indexer.service';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/indexer.service';

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
};