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
import { SubsocialTransactionWorker } from '../subsocial-transaction-worker';

const CHAIN_TYPE = ChainType.SUBSTRATE;
const CHAIN = SubstrateChain.XSOCIAL;
const TEST_ADDRESS = '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6';

describe('subsocial (xSocial) transaction worker tests', () => {
  let stage: Stage;
  let wallet: Wallet;
  const startBlock = 12635344;
  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_SUBSOCIAL_GRAPHQL_SERVER = 'http://localhost:4350/graphql';

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
    const successCreateSpaceTxHash =
      '0x79ba572aed0fc265a506a0a1764bf76c4c7e4615841c5632e9c30060df3ea4bc';
    for (const transactionHash of [successCreateSpaceTxHash]) {
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
      WorkerName.VERIFY_SUBSOCIAL_TRANSACTIONS,
      {
        parameters: { FunctionName: 'test', chainId: CHAIN },
      },
    );

    await new SubsocialTransactionWorker(
      workerDefinition,
      stage.context,
    ).runExecutor();

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      CHAIN,
      CHAIN_TYPE,
      wallet.address,
      0,
    );
    expect(txs.length).toBe(1);
    //success create space tX
    const successCreateSpaceTx = txs.find(
      (x) => x.transactionHash === successCreateSpaceTxHash,
    );
    expect(successCreateSpaceTx.transactionStatus).toEqual(
      TransactionStatus.CONFIRMED,
    );
    expect(successCreateSpaceTx.data).toBeTruthy();
  });
});
