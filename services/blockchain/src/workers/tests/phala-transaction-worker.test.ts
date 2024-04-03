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
import { PhalaTransactionWorker } from '../phala-transaction-worker';
import { getConfig } from '@apillon/tests-lib';

const CHAIN_TYPE = ChainType.SUBSTRATE;
const CHAIN = SubstrateChain.PHALA;
const TEST_ADDRESS = '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk';

describe('Phala tests', () => {
  let stage: Stage;
  let wallet: Wallet;
  let config: any;
  const startBlock = 3513452;
  beforeAll(async () => {
    stage = await setupTest();
    config = await getConfig();
    env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER = config.phala.indexerUrl;

    wallet = await new Wallet(
      {
        chain: CHAIN,
        chainType: CHAIN_TYPE,
        address: TEST_ADDRESS,
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
    const successContractTxHash =
      '0xf893908cc69287297d16171bf26d2d9508549920b9edd2eae2a3ba8ec71e54e0';
    const successOtherTxHash =
      '0xd723363ab2542e9d6e56f5b547fecf349a273dd77f03595fdfd57826ca2e8a5e';
    const failedTxHash =
      '0xb5bb1f53ca7359e2e0765577800cb8cbb0da7f1d4a8f0578fa44f2fc416ae578';
    const transactionHashes = [
      successContractTxHash,
      successOtherTxHash,
      failedTxHash,
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
      WorkerName.VERIFY_PHALA_TRANSACTIONS,
      {
        parameters: { FunctionName: 'test', chainId: CHAIN },
      },
    );

    await new PhalaTransactionWorker(
      workerDefinition,
      stage.context,
    ).runExecutor();

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      CHAIN,
      CHAIN_TYPE,
      wallet.address,
      0,
    );
    expect(txs.length).toBe(3);
    //success contract tX
    const successContractTx = txs.find(
      (x) => x.transactionHash === successContractTxHash,
    );
    expect(successContractTx.transactionStatus).toEqual(
      TransactionStatus.CONFIRMED,
    );
    expect(successContractTx.data).toEqual(
      '0x89a544f0482448fd6ba9a18e36290a6209e5386a963cf49ac1fd368b5f93aa62',
    );
    //success other tx
    const successOtherTx = txs.find(
      (x) => x.transactionHash === successOtherTxHash,
    );
    expect(successOtherTx.transactionStatus).toEqual(
      TransactionStatus.CONFIRMED,
    );
    expect(successOtherTx.data).toEqual(null);
    //failed tx
    const failedTx = txs.find((x) => x.transactionHash === failedTxHash);
    expect(failedTx.transactionStatus).toEqual(TransactionStatus.FAILED);
    expect(failedTx.data).toEqual(null);

    expect(txs.find((x) => !x['webhookTriggered'])).toBeFalsy();
  });
});
