import { ChainType, env, EvmChain, TransactionStatus } from '@apillon/lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Wallet } from '../../modules/wallet/wallet.model';
import { Transaction } from '../../common/models/transaction';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { EvmTransactionWorker } from '../evm-transaction-worker';
import { getConfig } from '@apillon/tests-lib';
import { Endpoint } from '../../common/models/endpoint';
import { EvmContractEventsWorker } from '../evm-contract-events-worker';

describe('Evm contract events tests', () => {
  let stage: Stage;
  let wallet: Wallet;
  let config: any;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();

    //Insert endpoint
    await new Endpoint({}, stage.context)
      .populate({
        url: 'https://testnet.sapphire.oasis.io',
        chain: EvmChain.OASIS,
        chainType: ChainType.EVM,
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Evm contract events tests', async () => {
    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'evm-contract-events-worker',
      {},
    );
    await new EvmContractEventsWorker(
      workerDefinition,
      stage.context,
    ).runExecutor({});
  });
});
