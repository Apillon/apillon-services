import {
  ChainType,
  env,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Wallet } from '../../modules/wallet/wallet.model';
import { DbTables, TxDirection } from '../../config/types';
import { TransactionLogWorker } from '../transaction-log-worker';
import { Endpoint } from '../../common/models/endpoint';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { Transaction } from '../../common/models/transaction';
import { getConfig } from '@apillon/tests-lib';

const CHAIN_TYPE = ChainType.SUBSTRATE;
const CHAIN = SubstrateChain.SUBSOCIAL;
const TRANSACTION_HASHES = [
  //spaces-space-created
  '0x97ed404dd962939e8bcaf509fb0955dd6cf3c873cd4f1de0cb200836f50022c8',
  //posts-post-created
  '0x4e815006b4fcb1b1d40c9c5c5f0e3b4c268fcaeb232c110d99d673a51246dda2',
  //withdrawl
  '0xcafeab947c5ca38799a5aef6d5eebf077f8359b7db215c00dc53f4782349820c',
  //deposit
  '0x87f1f67f4f7be27555a4c8d4889dfdf9f54afce730c83533a850ff6c70bea5f8',
];
const EXPECTED_TRANSACTION_LOGS = [
  {
    action: 'DEPOSIT',
    addressFrom: '3pWG8gygCNeVuNLSWXcD79iiXJPbpTekBTVNEmSNPPMmVC2J',
    addressTo: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
    amount: 100000000000,
    blockId: 4811752,
    direction: TxDirection.INCOME,
    fee: 0,
    hash: '0x87f1f67f4f7be27555a4c8d4889dfdf9f54afce730c83533a850ff6c70bea5f8',
    token: 'SUB',
    totalPrice: 100000000000,
    value: 0.1, //in tests price per token is 0.01, and in worker value is rounded to 4 decimals
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
    addressTo: '3pWG8gygCNeVuNLSWXcD79iiXJPbpTekBTVNEmSNPPMmVC2J',
    amount: 50000000000,
    blockId: 4755519,
    direction: TxDirection.COST,
    fee: 259940000,
    hash: '0xcafeab947c5ca38799a5aef6d5eebf077f8359b7db215c00dc53f4782349820c',
    token: 'SUB',
    totalPrice: 50259940000,
    value: 0.0503, //in tests price per token is 0.01, and in worker value is rounded to 4 decimals
  },
  {
    action: 'TRANSACTION',
    addressFrom: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
    addressTo: null,
    amount: 0,
    blockId: 4755753,
    direction: TxDirection.COST,
    fee: 301727840,
    hash: '0x97ed404dd962939e8bcaf509fb0955dd6cf3c873cd4f1de0cb200836f50022c8',
    token: 'SUB',
    totalPrice: 301727840,
    value: 0.0003, //in tests price per token is 0.01, and in worker value is rounded to 4 decimals
  },
  {
    action: 'TRANSACTION',
    addressFrom: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
    addressTo: null,
    amount: 0,
    blockId: 4755753,
    direction: TxDirection.COST,
    fee: 315110800,
    hash: '0x4e815006b4fcb1b1d40c9c5c5f0e3b4c268fcaeb232c110d99d673a51246dda2',
    token: 'SUB',
    totalPrice: 315110800,
    value: 0.0003, //in tests price per token is 0.01, and in worker value is rounded to 4 decimals
  },
];

const mockAxios = new MockAdapter(axios);

describe('Subsocial transaction Log Worker unit test', () => {
  let stage: Stage;
  let config: any;
  let wallet: Wallet;
  let phalaLogCount: number;
  let writeEventLogMock: any;

  let worker: TransactionLogWorker;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();
    env.BLOCKCHAIN_SUBSOCIAL_GRAPHQL_SERVER = 'http://3.251.2.33:8087/graphql';

    wallet = new Wallet(
      {
        status: 5,
        address: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
        chain: CHAIN,
        chainType: CHAIN_TYPE,
        token: 'SUB',
        seed: '1',
        minBalance: '10000000000',
        currentBalance: '0',
        decimals: 10,
        blockParseSize: 4811755, //This is block to where tests should fetch transactions
      },
      stage.context,
    );

    await wallet.insert();
    let nonce = 0;
    for (const transactionHash of TRANSACTION_HASHES) {
      await new Transaction(
        {
          nonce,
          address: 'address',
          chainType: ChainType.SUBSTRATE,
          chain: SubstrateChain.SUBSOCIAL,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash,
          rawTransaction: 'rawTransaction',
        },
        stage.context,
      ).insert();
      nonce += 1;
    }

    await new Endpoint(
      {
        ...config.subsocial.endpoint,
        chain: config.subsocial.chain,
        chainType: config.subsocial.chainType,
      },
      stage.context,
    ).insert();

    const wd = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-subsocial-transaction-worker',
      { parameters: {} },
    );
    worker = new TransactionLogWorker(
      wd,
      stage.context,
      QueueWorkerType.PLANNER,
    );
    writeEventLogMock = jest.spyOn(
      TransactionLogWorker.prototype as any,
      'writeEventLog',
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test Subsocial Wallet Logging', async () => {
    const walletPlans = await worker.runPlanner();
    expect(walletPlans.length).toBe(1);
    const walletPlan = walletPlans.find(
      (x) => x.wallet.address === wallet.address,
    );
    expect(walletPlan.wallet.address).toBe(wallet.address);
    expect(walletPlan.wallet.id).toBe(wallet.id);
    mockAxios
      .onGet(/https:\/\/api.coingecko.com\/api\/v3\/simple\/price.*/)
      .reply(200, {
        subsocial: { usd: 0.01 },
      });

    await worker.runExecutor(walletPlan);

    expect(mockAxios.history.get.length).toBe(1);
    expect(mockAxios.history.get[0].url).toBe(
      'https://api.coingecko.com/api/v3/simple/price?ids=subsocial&vs_currencies=USD',
    );

    // logTransactions
    const transactionLogs = (
      await stage.db.paramExecute(
        `
        SELECT * FROM \`${DbTables.TRANSACTION_LOG}\` WHERE wallet = @address
        `,
        { address: wallet.address },
      )
    ).map(
      ({
        blockId,
        direction,
        action,
        addressFrom,
        addressTo,
        hash,
        token,
        amount,
        fee,
        totalPrice,
        value,
      }) => ({
        blockId,
        direction,
        action,
        addressFrom,
        addressTo,
        hash,
        token,
        amount,
        fee,
        totalPrice,
        value,
      }),
    );

    //Check only transactions properties, with expected transactions
    expect(
      transactionLogs.filter((x) =>
        EXPECTED_TRANSACTION_LOGS.find((y) => y.hash == x.hash),
      ),
    ).toStrictEqual(EXPECTED_TRANSACTION_LOGS);

    // DEPOSITS
    const deposits = (
      await stage.db.paramExecute(
        `
        SELECT * FROM \`${DbTables.WALLET_DEPOSIT}\` WHERE wallet_id = @walletId
        `,
        { walletId: wallet.id },
      )
    ).map(
      ({ transactionHash, depositAmount, currentAmount, pricePerToken }) => ({
        transactionHash,
        depositAmount,
        currentAmount,
        pricePerToken,
      }),
    );
    expect(deposits).toStrictEqual([
      {
        currentAmount: 49123221360,
        depositAmount: 100000000000,
        pricePerToken: 0.01,
        transactionHash:
          '0x87f1f67f4f7be27555a4c8d4889dfdf9f54afce730c83533a850ff6c70bea5f8',
      },
    ]);
  });
});
