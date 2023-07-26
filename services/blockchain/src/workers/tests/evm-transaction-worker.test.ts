import { ChainType, EvmChain, TransactionStatus, env } from '@apillon/lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { Wallet } from '../../modules/wallet/wallet.model';
import { Transaction } from '../../common/models/transaction';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { EvmTransactionWorker } from '../evm-transaction-worker';

describe('Handle evm transactions', () => {
  let stage: Stage;
  let wallet: Wallet;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER =
      'http://18.203.251.180:8083/graphql';
    const address = '0xba01526c6d80378a9a95f1687e9960857593983b';
    const chain = EvmChain.MOONBEAM;
    const chainType = ChainType.EVM;
    const fromBlock = 3608736;
    wallet = await new Wallet(
      {
        chain,
        chainType,
        address,
        seed: 'neki neki neki neki neki neki druzga pet dva tri stiri',
        lastParsedBlock: fromBlock,
        blockParseSize: 50000,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Evm single wallet transactions', async () => {
    const address = '0xba01526c6d80378a9a95f1687e9960857593983b';
    const chain = EvmChain.MOONBEAM;
    const chainType = ChainType.EVM;

    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 1,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x0da1158a73d7dd99871f865a7cfb1a01f88df56fa73db69d17a446be719ae28b',
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
          '0xd77a7023487e476c13a8b0de0cdc6c1cddea5dee9a95532afde347f977f0d768',
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
          '0xa517c9b7efa3d6df34f4944812efc284c0fc0ae968a1cf83ea07ba5400755f6b',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 4,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0xe7050b07ebdf1800ed7fe7d11095948e539299b229ff85fec4372f7f0c5fb0a9',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 5,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x4c5f0d5f29cde4d06fc16702d0e7b11209900698f2c51e6ce0e359bd2f54bb35',
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
          '0xc86bdd59ebce93664ecc0eb2c529faf6dfb47884225087adac231946471d5cec',
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
          '0xc2de112399837d0a26e603bb64cfb9d88d85e3f5ba6a71510b0f46e267a426c7',
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
          '0xd82621809c21848d773aecd1b94d6313c9d765f60495de94626d00338ca66495',
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
          '0x42d977fbe234cc027ce4a7a092a9f8fa36351ba1c0d6fba2ca11d13d1e49fdbe',
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
    await new EvmTransactionWorker(workerDefinition, stage.context).runExecutor(
      { executeArg: EvmChain.MOONBEAM },
    );

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

    expect(txs.length).toBe(9);
    expect(confirmed).toBe(true);
  });
});
