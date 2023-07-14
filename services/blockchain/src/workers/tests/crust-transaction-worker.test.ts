import {
  ChainType,
  env,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Transaction } from '../../common/models/transaction';
import { Wallet } from '../../common/models/wallet';
import { CrustTransactionWorker } from '../crust-transaction-worker';

describe.skip('Handle crust transactions (storage orders)', () => {
  let stage: Stage;
  let wallet: Wallet;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://18.203.251.180:8081/graphql';
    const address = 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU';
    const chain = SubstrateChain.CRUST;
    const chainType = ChainType.SUBSTRATE;
    const fromBlock = 6578112;
    wallet = await new Wallet(
      {
        chain,
        chainType,
        address,
        seed: 'neki neki neki neki neki neki druzga pet dva tri stiri',
        lastParsedBlock: fromBlock,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Single wallet transactions', async () => {
    const address = 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU';
    const chain = SubstrateChain.CRUST;
    const chainType = ChainType.SUBSTRATE;

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

  test('Processing multiple transactions (storage orders)', async () => {
    const address = 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU';
    const chain = SubstrateChain.CRUST;
    const chainType = ChainType.SUBSTRATE;
    const fromBlock = 7912024;
    wallet.lastParsedBlock = fromBlock;
    await wallet.update();
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 5,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x0cda7502e8160d18e84f4ecdba3edbbed487a25d4a354409da9530ff1e0d720e',
      },
      stage.context,
    ).insert();
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 6,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x198aea301b6cac97701473316feaaa8e6ac4940d2dbd852d9d39490bfea54a12',
      },
      stage.context,
    ).insert();
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 7,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x350faa9b8dfa1f09979c1d1fe95ce493499e838f84c5d81be2ee72b8beab2e7f',
      },
      stage.context,
    ).insert();
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 8,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x4f9c8fa2abbd424510b345bf52402d991937a48cf8105403c790ce6ffef96ece',
      },
      stage.context,
    ).insert();
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 9,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x1b42f9423d832facf8dbd7341f28c8cd68873cb72dec2c5c40c25c12dd64d3a5',
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
      4,
    );
    let confirmed = true;
    txs.forEach((tx) => {
      if (tx.transactionStatus !== TransactionStatus.CONFIRMED) {
        confirmed = false;
      }
    });
    expect(txs.length).toBe(5);
    expect(confirmed).toBe(true);
  });
});
