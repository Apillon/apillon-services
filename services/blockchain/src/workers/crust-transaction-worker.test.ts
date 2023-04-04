import {
  ChainType,
  env,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../test/setup';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../common/models/wallet';
import { CrustTransactionWorker } from './crust-transaction-worker';

describe('Handle crust transactions', () => {
  let stage: Stage;
  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://18.203.251.180:8080/graphql';
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Single wallet transactions', async () => {
    const address = 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU';
    const chain = SubstrateChain.CRUST;
    const chainType = ChainType.SUBSTRATE;

    await new Wallet(
      {
        chain,
        chainType,
        address,
        seed: 'neki neki neki neki neki neki druzga pet dva tri stiri',
        lastParsedBlock: 6578112,
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 1,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0xba43b181a8ba2f467a67f7fdb7a1b87110a487cfd8d693e35cd51fa615754cd2',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 2,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0xd19fcea891c243aedc1315200e97cc2df0d8ae76e7f7e0e4d6cdf9febe1e8a76',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 3,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x18be14abcfac002403aac2e8185394bee74ac443a49c5c9a1fdf3e9ccf650f8b',
      },
      stage.context,
    ).insert();

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-crust-transaction-worker',
      {},
    );
    await new CrustTransactionWorker(
      workerDefinition,
      stage.context,
    ).runExecutor({});

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      chain,
      chainType,
      address,
      0,
    );

    let confirmed = true;
    txs.forEach((tx) => {
      if (tx.transactionStatus !== TransactionStatus.CONFIRMED) {
        confirmed = false;
      }
    });

    expect(txs.length).toBe(3);
    expect(confirmed).toBe(true);
  });
});
