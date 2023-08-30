import { mnemonicGenerate } from '@polkadot/util-crypto';
import {
  ChainType,
  env,
  SerializeFor,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Transaction } from '../../common/models/transaction';
import { Wallet } from '../../modules/wallet/wallet.model';
import { SubstrateTransactionWorker } from '../substrate-transaction-worker';
import { WorkerName } from '../worker-executor';

describe('Substrate tests', () => {
  let stage: Stage;
  let wallet: Wallet;
  let wallet_2: Wallet;
  const startBlock = 3982289;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_KILT_GRAPHQL_SERVER = 'http://3.251.2.33:8082/graphql';
    const chain = SubstrateChain.KILT;
    const chainType = ChainType.SUBSTRATE;

    wallet = await new Wallet(
      {
        chain,
        chainType,
        address: '4qb612mWyrA2Ga2WhXRgYE7tqo8rGs6f6UBZciqcJvfYUGTp',
        // This is actually not correct - the seed should match the address
        seed: mnemonicGenerate(),
        lastParsedBlock: startBlock,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Single wallet transactions', async () => {
    const address = '4qb612mWyrA2Ga2WhXRgYE7tqo8rGs6f6UBZciqcJvfYUGTp';
    const chain = SubstrateChain.KILT;
    const chainType = ChainType.SUBSTRATE;

    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 1,
        rawTransaction: 'SOME_RAW_DATA',
        transactionHash:
          '0x743a3e8e255c5623da1b3e84ee28a671ada6ac92fd347215f2904b142d32a1fd',
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
        rawTransaction: 'SOME_RAW_DATA_2',
        transactionHash:
          '0x2cef26ef0ab429985cd9a6f7f7e4443bf16bbab387b696d940f1ecca87e62e88',
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
        rawTransaction: 'SOME_RAW_DATA_3',
        transactionHash:
          '0x676202a86bf27eeefdc10c7a1546800dd75912769f23247baae8abd5366cb93b',
      },
      stage.context,
    ).insert();

    const parameters = {
      chainId: SubstrateChain.KILT,
    };

    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };

    const workerDefinition = new WorkerDefinition(
      serviceDef,
      WorkerName.SUBSTRATE_TRANSACTION,
      {
        parameters: { FunctionName: 'test', ...parameters },
      },
    );

    await new SubstrateTransactionWorker(
      workerDefinition,
      stage.context,
    ).runExecutor();

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      chain,
      chainType,
      address,
      0,
    );

    console.log('TXS: ', txs);

    expect(txs.length).toBe(3);
    expect(
      txs.find((x) => x.transactionStatus != TransactionStatus.CONFIRMED),
    ).toBeFalsy();
  });

  test('Single wallet_2 failed transaction not accounted', async () => {
    const chain = SubstrateChain.KILT;
    const chainType = ChainType.SUBSTRATE;
    const address = '4sAqndzGzNYtrdAWhSSnaGptrGY1TSJ99kf5ZRwAzcPUbaTN';

    wallet.lastParsedBlock = 4476985;
    await wallet.update();

    // Failed 1
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 1,
        rawTransaction: 'FAILED_TRANSACTION',
        transactionHash:
          '0x23a0b353374c195563a9708b2953a7c3467e80fc9f29f69358b8e1b7c8441478',
      },
      stage.context,
    ).insert();

    // Failed 2
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 1,
        rawTransaction: 'FAILED_TRANSACTION',
        transactionHash:
          '0x882cf85d776dbc4a78edd189b976b4a67ae15f2a871e56f20d41242aa20d29d6',
      },
      stage.context,
    ).insert();

    // Failed 3
    await new Transaction(
      {
        address,
        chain,
        chainType,
        transactionStatus: TransactionStatus.PENDING,
        nonce: 1,
        rawTransaction: 'FAILED_TRANSACTION',
        transactionHash:
          '0x17ae03bc64d1b9c332b1874c864eae60dcdea040ecede965b4ccf8e9f3331432',
      },
      stage.context,
    ).insert();

    const parameters = {
      chainId: SubstrateChain.KILT,
    };

    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };

    const workerDefinition = new WorkerDefinition(
      serviceDef,
      WorkerName.SUBSTRATE_TRANSACTION,
      {
        parameters: { FunctionName: 'test', ...parameters },
      },
    );

    await new SubstrateTransactionWorker(
      workerDefinition,
      stage.context,
    ).runExecutor();

    console.log('Getting transactions: ');

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      chain,
      chainType,
      address,
      0,
    );

    console.log('Transactions: ', txs);

    expect(
      txs.find((x) => x.transactionStatus == TransactionStatus.FAILED),
    ).toBeTruthy();
    expect(txs.length).toEqual(3);
  });
});
