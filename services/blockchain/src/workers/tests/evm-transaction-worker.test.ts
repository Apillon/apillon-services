import { ChainType, env, EvmChain, TransactionStatus } from '@apillon/lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Wallet } from '../../modules/wallet/wallet.model';
import { Transaction } from '../../common/models/transaction';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { EvmTransactionWorker } from '../evm-transaction-worker';
import { getConfig } from '@apillon/tests-lib';

describe('Handle evm transactions', () => {
  let stage: Stage;
  let wallet: Wallet;
  let config: any;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();
    env.BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER = config.moonbase.indexerUrl;
    const chain = EvmChain.MOONBASE;
    const chainType = ChainType.EVM;
    wallet = await new Wallet(
      {
        chain,
        chainType,
        address: '0xba01526c6d80378a9a95f1687e9960857593983b',
        seed: 'neki neki neki neki neki neki druzga pet dva tri stiri',
        lastParsedBlock: 5_722_450,
        blockParseSize: 50_000,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Evm single wallet transactions', async () => {
    const chain = EvmChain.MOONBASE;
    const chainType = ChainType.EVM;

    await new Transaction(
      {
        address: wallet.address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 1,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x91ccb62d93777411de3126b4687ca9f24f40ef95890580b7be6b3f0ca4b0fa03',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address: wallet.address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 3,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95de',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address: wallet.address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 5,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0xfa677a1ad0ff9d90f9211f4cb001085fe1b5b85b9e6e2794fbdb435d4d7f4f44',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address: wallet.address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 7,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x4131cbc163f0ae6a25bc2d16b5d6539e7b3178b100f1315f5419c7f4fb25f3e4',
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        address: wallet.address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 9,
        rawTransaction: 'blablablablablablablablablablablalba',
        transactionHash:
          '0x1260c8df833e63ce8cf7b29416af00c8bc65c193ff2c97430a5681907e54f779',
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
      { chain: EvmChain.MOONBASE },
    );

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      chain,
      chainType,
      wallet.address,
      0,
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
