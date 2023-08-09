import { SubstrateChain, env } from '@apillon/lib';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/crust-indexer.service';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';

export const ParachainConfig = {
  CRUST: {
    id: SubstrateChain.CRUST,
    name: 'CRUST',
    webhookWorkerName: 'UpdateCrustStatusWorker',
    sqsUrl: `${env.AUTH_AWS_WORKER_SQS_URL}`,
    indexer: CrustBlockchainIndexer,
  },
  KILT: {
    id: SubstrateChain.KILT,
    name: 'KILT',
    webhookWorkerName: 'UpdateStateWorker',
    sqsUrl: `${env.AUTH_AWS_WORKER_SQS_URL}`,
    indexer: KiltBlockchainIndexer,
  },
};
