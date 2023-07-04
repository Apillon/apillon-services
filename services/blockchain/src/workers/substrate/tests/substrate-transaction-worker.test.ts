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
import { releaseStage, setupTest, Stage } from '../../../../test/setup';
import { Transaction } from '../../../common/models/transaction';
import { Wallet } from '../../../common/models/wallet';
import { SubstrateTransactionWorker } from '../substrate-transaction-worker';
import { WorkerName } from '../../worker-executor';

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

    let confirmed = true;
    txs.forEach((tx) => {
      if (tx.transactionStatus !== TransactionStatus.CONFIRMED) {
        confirmed = false;
      }
    });

    expect(txs.length).toBe(3);
    expect(confirmed).toBe(true);
  });

  //   test('Processing multiple transactions (storage orders)', async () => {
  //     const address = 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU';
  //     const chain = SubstrateChain.CRUST;
  //     const chainType = ChainType.SUBSTRATE;
  //     const fromBlock = 7912024;

  //     wallet.lastParsedBlock = fromBlock;
  //     await wallet.update();

  //     await new Transaction(
  //       {
  //         address,
  //         chain,
  //         chainType,
  //         transactionStatus: TransactionStatus.PENDING,
  //         nonce: 5,
  //         rawTransaction: 'blablablablablablablablablablablalba',
  //         transactionHash:
  //           '0x0cda7502e8160d18e84f4ecdba3edbbed487a25d4a354409da9530ff1e0d720e',
  //       },
  //       stage.context,
  //     ).insert();

  //     await new Transaction(
  //       {
  //         address,
  //         chain,
  //         chainType,
  //         transactionStatus: TransactionStatus.PENDING,
  //         nonce: 6,
  //         rawTransaction: 'blablablablablablablablablablablalba',
  //         transactionHash:
  //           '0x198aea301b6cac97701473316feaaa8e6ac4940d2dbd852d9d39490bfea54a12',
  //       },
  //       stage.context,
  //     ).insert();

  //     await new Transaction(
  //       {
  //         address,
  //         chain,
  //         chainType,
  //         transactionStatus: TransactionStatus.PENDING,
  //         nonce: 7,
  //         rawTransaction: 'blablablablablablablablablablablalba',
  //         transactionHash:
  //           '0x350faa9b8dfa1f09979c1d1fe95ce493499e838f84c5d81be2ee72b8beab2e7f',
  //       },
  //       stage.context,
  //     ).insert();

  //     await new Transaction(
  //       {
  //         address,
  //         chain,
  //         chainType,
  //         transactionStatus: TransactionStatus.PENDING,
  //         nonce: 8,
  //         rawTransaction: 'blablablablablablablablablablablalba',
  //         transactionHash:
  //           '0x4f9c8fa2abbd424510b345bf52402d991937a48cf8105403c790ce6ffef96ece',
  //       },
  //       stage.context,
  //     ).insert();

  //     await new Transaction(
  //       {
  //         address,
  //         chain,
  //         chainType,
  //         transactionStatus: TransactionStatus.PENDING,
  //         nonce: 9,
  //         rawTransaction: 'blablablablablablablablablablablalba',
  //         transactionHash:
  //           '0x1b42f9423d832facf8dbd7341f28c8cd68873cb72dec2c5c40c25c12dd64d3a5',
  //       },
  //       stage.context,
  //     ).insert();

  //     const workerDefinition = new WorkerDefinition(
  //       {
  //         type: ServiceDefinitionType.SQS,
  //         config: { region: 'test' },
  //         params: { FunctionName: 'test' },
  //       },
  //       'test-crust-transaction-worker',
  //       {},
  //     );
  //     await new CrustTransactionWorker(
  //       workerDefinition,
  //       stage.context,
  //     ).runExecutor({});

  //     const txs: Transaction[] = await new Transaction({}, stage.context).getList(
  //       chain,
  //       chainType,
  //       address,
  //       4,
  //     );

  //     let confirmed = true;
  //     txs.forEach((tx) => {
  //       if (tx.transactionStatus !== TransactionStatus.CONFIRMED) {
  //         confirmed = false;
  //       }
  //     });

  //     expect(txs.length).toBe(5);
  //     expect(confirmed).toBe(true);
  //   });
});
