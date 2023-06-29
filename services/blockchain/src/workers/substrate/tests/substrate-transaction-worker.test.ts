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
import { insertControlTransaction } from './utils';
import { SubstrateTransactionWorker } from '../substrate-transaction-worker';
import { WorkerName } from '../../worker-executor';
// import { CrustTransactionWorker } from './crust-transaction-worker'

describe('Kilt tests', () => {
  let stage: Stage;
  let wallet: Wallet;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_KILT_GRAPHQL_SERVER = 'http://18.203.251.180:8082/graphql';
    const address = '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn';
    const chain = SubstrateChain.KILT;
    const chainType = ChainType.SUBSTRATE;
    // BIP-39 mnemonic
    const mnemonic = mnemonicGenerate();
    const fromBlock = 3996243;
    wallet = await new Wallet(
      {
        chain,
        chainType,
        address,
        seed: mnemonic,
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
    const chain = SubstrateChain.KILT;
    const chainType = ChainType.SUBSTRATE;
    await insertControlTransaction(
      address,
      chain,
      chainType,
      stage.context,
      '0xd19fcea891c243aedc1315200e91',
    );
    await insertControlTransaction(
      address,
      chain,
      chainType,
      stage.context,
      '0xd19fcea891c243aedc1315200e92',
    );
    await insertControlTransaction(
      address,
      chain,
      chainType,
      stage.context,
      '0xd19fcea891c243aedc1315200e93',
    );

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

    // const txs: Transaction[] = await new Transaction({}, stage.context).getList(
    //   chain,
    //   chainType,
    //   address,
    //   0,
    // );
    // let confirmed = true;
    // txs.forEach((tx) => {
    //   if (tx.transactionStatus !== TransactionStatus.CONFIRMED) {
    //     confirmed = false;
    //   }
    // });
    // expect(txs.length).toBe(3);
    // expect(confirmed).toBe(true);
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
