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
import { WorkerName } from '../worker-executor';
import { AcurastJobTransactionWorker } from '../accurast-job-transaction-worker';
import { getConfig } from '@apillon/tests-lib';

const CHAIN_TYPE = ChainType.SUBSTRATE;
const CHAIN = SubstrateChain.ACURAST;
const TEST_ADDRESS = '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU';

describe('Acurast tests', () => {
  let stage: Stage;
  let wallet: Wallet;
  let config: any;
  const startBlock = 2250700;
  beforeAll(async () => {
    stage = await setupTest();
    config = await getConfig();
    env.BLOCKCHAIN_ACURAST_GRAPHQL_SERVER = config.acurast.indexerUrl;

    wallet = await new Wallet(
      {
        chain: CHAIN,
        chainType: CHAIN_TYPE,
        address: TEST_ADDRESS,
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
    const successContractTxHash =
      '0xfc027008cbfbd03fef17640dbb5bc89d233593d461c079fc397a926fa8916475';
    const successOtherTxHash =
      '0x674a4e59d2e5115d58efcf5a0bb198baa4de32083617e890eb53cca6ad6acd7d';
    // const failedTxHash =
    //   '0x8c0ef08f1dc2c05031fef00882fcff9b3e2e13cc5a97012695194b0a3dca68c0';
    const transactionHashes = [
      successContractTxHash,
      successOtherTxHash,
      // failedTxHash,
    ];
    for (const transactionHash of transactionHashes) {
      await new Transaction(
        {
          address: wallet.address,
          chain: CHAIN,
          chainType: CHAIN_TYPE,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 1,
          rawTransaction: 'SOME_RAW_DATA',
          transactionHash,
        },
        stage.context,
      ).insert();
    }
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const workerDefinition = new WorkerDefinition(
      serviceDef,
      WorkerName.VERIFY_ACURAST_TRANSACTIONS,
      {
        parameters: { FunctionName: 'test', chainId: CHAIN },
      },
    );

    await new AcurastJobTransactionWorker(
      workerDefinition,
      stage.context,
    ).runExecutor();

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      CHAIN,
      CHAIN_TYPE,
      wallet.address,
      0,
    );
    expect(txs.length).toBe(2);
    //success contract tX
    const successContractTx = txs.find(
      (x) => x.transactionHash === successContractTxHash,
    );
    expect(successContractTx.transactionStatus).toEqual(
      TransactionStatus.CONFIRMED,
    );
    expect(successContractTx.data).toEqual('2478');
    //success other tx
    const successOtherTx = txs.find(
      (x) => x.transactionHash === successOtherTxHash,
    );
    expect(successOtherTx.transactionStatus).toEqual(
      TransactionStatus.CONFIRMED,
    );
    expect(successOtherTx.data).toEqual(null);
    //failed tx
    // const failedTx = txs.find((x) => x.transactionHash === failedTxHash);
    // expect(failedTx.transactionStatus).toEqual(TransactionStatus.FAILED);
    // expect(failedTx.data).toEqual(null);

    expect(txs.find((x) => !x['webhookTriggered'])).toBeFalsy();
  });
});
