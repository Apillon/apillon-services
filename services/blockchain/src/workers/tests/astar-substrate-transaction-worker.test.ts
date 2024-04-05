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
import { SubstrateContractTransactionWorker } from '../substrate-contract-transaction-worker';
import { getConfig } from '@apillon/tests-lib';

const CHAIN_TYPE = ChainType.SUBSTRATE;
const CHAIN = SubstrateChain.ASTAR;
const TEST_ADDRESS = 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua';

describe('Astar Substrate tests', () => {
  let stage: Stage;
  let wallet: Wallet;
  let config: any;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();
    env.BLOCKCHAIN_ASTAR_SUBSTRATE_GRAPHQL_SERVER =
      config.astar_substrate.indexerUrl;

    wallet = await new Wallet(
      {
        chain: CHAIN,
        chainType: CHAIN_TYPE,
        address: TEST_ADDRESS,
        seed: mnemonicGenerate(),
        blockParseSize: 200,
        lastParsedBlock: 5964393,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Single wallet transactions', async () => {
    const successContractTxHash =
      '0xc652dfd71f5236fa1824afe1d7303074ed79230174112c5c9e23885a1b7d3728';
    const successOtherTxHash =
      '0xd3efaf9ccfcf3d2de1a9170ec11b596bab301e62564977a96d3144910e92d515';
    const failedTxHash =
      '0xf33441e8307f44fefc3bb05abb3d06b69f6fc5e123b3b598f19b96e17d4df754';
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
      WorkerName.VERIFY_ASTAR_SUBSTRATE_TRANSACTIONS,
      {
        parameters: { FunctionName: 'test', chainId: CHAIN },
      },
    );

    await new SubstrateContractTransactionWorker(
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
      'be7JaWwuopcmZTcBXhj8wUfekDQj4fWkYraR3uQTdocDPZd',
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
