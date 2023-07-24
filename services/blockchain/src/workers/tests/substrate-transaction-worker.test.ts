import { mnemonicGenerate } from '@polkadot/util-crypto';
import {
  ChainType,
  env,
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

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_KILT_GRAPHQL_SERVER = 'http://18.203.251.180:8082/graphql';
    const address = '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn';
    const chain = SubstrateChain.KILT;
    const chainType = ChainType.SUBSTRATE;

    wallet = await new Wallet(
      {
        chain,
        chainType,
        address,
        // This is actually not correct - the seed should match the address
        seed: mnemonicGenerate(),
        lastParsedBlock: 1,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Single wallet transactions', async () => {
    const address = '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn';
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
          '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689ce',
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
          '0x41a4ea4e792b7326e8d7fff275f2033b451b174994a44b5308b9ac4c1ddbf3df',
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
          '0xcef2d10686fa042c01277ec898b0b75f2016b05e252205da7ec664d1fa5daef0',
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

    expect(txs.length).toBe(3);
    expect(
      txs.find((x) => x.transactionStatus != TransactionStatus.CONFIRMED),
    ).toBeFalsy();
  });
});
