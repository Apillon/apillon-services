import {
  ChainType,
  EvmChain,
  SubstrateChain,
  TransactionStatus,
  env,
} from '@apillon/lib';
import { EvmBlockchainIndexer } from './evm-indexer.service';
import { EvmTransfers } from './data-models/evm-transfer';
import { Transaction } from '../../../common/models/transaction';
import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { SubstrateTransactionWorker } from '../../../workers/substrate-transaction-worker';
import { WorkerName } from '../../../workers/worker-executor';
import { EvmTransactionWorker } from '../../../workers/evm-transaction-worker';
import { Wallet } from '../../wallet/wallet.model';

describe('MOONBASE', () => {
  const address = '0xba01526c6d80378a9a95f1687e9960857593983b';
  let stage: Stage;
  const chain = 1287;
  const chainType = ChainType.EVM;
  let wallet: Wallet;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER = 'http://3.251.2.33:8083/graphql';

    wallet = await new Wallet(
      {
        chain,
        chainType,
        address: '0xba01526c6d80378a9a95f1687e9960857593983b',
        // This is actually not correct - the seed should match the address
        seed: 'Yadayaya',
        lastParsedBlock: 4845276,
        blockParseSize: 1e6, // Set to something huge, since it's only test and we want to account all TX
        nonce: 1,
      },
      stage.context,
    ).insert();
  });

  // afterAll(async () => {
  //   await releaseStage(stage);
  // });

  test('Single transaction update test', async () => {
    const chain = 1287;
    const chainType = ChainType.EVM;
    const controlHashSuccess =
      '0x84ad9150974e47f4746b53c7169317ab3ec10a8d96c2a55624f75966d7431465';
    const controlHashFail =
      '0xa530750e55fbfd3b67d0422d78a9195659fa7c76c8cb0a117346d7be62a55239';
    const address = '0xba01526c6d80378a9a95f1687e9960857593983b';

    await new Transaction(
      {
        chain: chain,
        chainType: chainType,
        address: address,
        to: null,
        nonce: 602,
        referenceTable: 'test',
        referenceId: 'test',
        rawTransaction: 'heheheheh',
        data: {},
        transactionHash: controlHashSuccess,
        transactionStatus: TransactionStatus.PENDING,
      },
      stage.context,
    ).insert();

    await new Transaction(
      {
        chain: chain,
        chainType: chainType,
        address: address,
        to: null,
        nonce: 538,
        referenceTable: 'test',
        referenceId: 'test',
        rawTransaction: 'heheheheh',
        data: {},
        transactionHash: controlHashFail,
        transactionStatus: TransactionStatus.PENDING,
      },
      stage.context,
    ).insert();

    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };

    const workerDefinition = new WorkerDefinition(
      serviceDef,
      WorkerName.EVM_TRANSACTIONS,
      {
        parameters: { FunctionName: 'test' },
      },
    );

    await new EvmTransactionWorker(workerDefinition, stage.context).runExecutor(
      { chain: EvmChain.MOONBASE },
    );

    const transactions: Transaction[] = await new Transaction(
      {},
      stage.context,
    ).getList(chain, chainType, address, 1);

    expect(transactions.length).toEqual(2);
    const statuses = transactions.map((x) => x.transactionStatus);
    const hashes = transactions.map((x) => x.transactionHash);

    console.log(statuses);
    console.log(hashes);

    expect(
      statuses.includes(TransactionStatus.CONFIRMED) &&
        statuses.includes(TransactionStatus.FAILED),
    ).toBeTruthy();
    expect(
      hashes.includes(controlHashFail) && hashes.includes(controlHashSuccess),
    ).toBeTruthy();
  });
});
