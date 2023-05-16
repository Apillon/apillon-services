import { ChainType, SubstrateChain } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../test/setup';
import { Wallet } from '../common/models/wallet';
import { TransactionLogWorker } from './transaction-log-worker';

describe('Transaction Log Worker unit test', () => {
  let stage: Stage;
  let crustWallet: Wallet;

  beforeAll(async () => {
    stage = await setupTest();

    crustWallet = new Wallet(
      {
        status: 5,
        address: 'cTHA4D34PHTD5jkK68tbyLakwnC6mYWgUEq6pA1kSqAeUtpH1',
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
      },
      stage.context,
    );

    await crustWallet.insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test Crust Wallet Logging', async () => {
    const wd = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-crust-transaction-worker',
    );
    const worker = new TransactionLogWorker(
      wd,
      stage.context,
      QueueWorkerType.PLANNER,
      '',
    );
    const wallets = await worker.runPlanner();
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe(crustWallet.address);
  });
});
