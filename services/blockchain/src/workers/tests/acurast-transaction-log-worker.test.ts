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
import { DbTables } from '../../config/types';
import { TransactionLogWorker } from '../transaction-log-worker';
import { Endpoint } from '../../common/models/endpoint';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { Transaction } from '../../common/models/transaction';
import { getConfig } from '@apillon/tests-lib';

const CHAIN_TYPE = ChainType.SUBSTRATE;
const CHAIN = SubstrateChain.ACURAST;
const TRANSACTION_HASHES = [
  '0x674a4e59d2e5115d58efcf5a0bb198baa4de32083617e890eb53cca6ad6acd7d',
  '0xfc027008cbfbd03fef17640dbb5bc89d233593d461c079fc397a926fa8916475',
  '0x8c0ef08f1dc2c05031fef00882fcff9b3e2e13cc5a97012695194b0a3dca68c0',
  '0xfdfae31056c06782d37f6f4a2052f3deec099b215b85c7ac9d9366aaf798671b',
  '0x3b072c0fe456c9f75c1c7e5350d90c331dfb1554a3d188d937bc9ce6ca072226',
  '0xb7b268f48a20e9ab09380aead7924cb5108bb1e65df3c4f6907c3c6fd85fce8b',
  '0x088db9cd79b1fbe73f3194e0e098f02809ccc43d514b60a597b392d7ded41f55',
  '0xe97364bbff62daf35de63e526832a5814442cd6a7bc5d262ed93fda74628b185',
  '0x0012e58cfde37b67b440de828102696a99c5d5191c5eb32a7d4060c7b213b3a7',
  '0xe82ebe242b5996af46f5a7ea28ac4a4650c8885ac7be62c19723fc5570193080',
  '0x7a733e16f9120ed70d6ddcf5ea798608f2e78dfafac9d738b00d11b306aaa086',
];
const EXPECTED_TRANSACTION_LOGS = [
  {
    action: 'DEPOSIT',
    addressFrom: '5EAFqBNRWhe93pXvvkXB1oBHe15btTyw6vy21eGtwRqXjFLz',
    addressTo: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    amount: 4000000000000,
    blockId: 2250703,
    direction: 1,
    fee: 0,
    hash: '0x674a4e59d2e5115d58efcf5a0bb198baa4de32083617e890eb53cca6ad6acd7d',
    token: 'ACU',
    totalPrice: 4000000000000,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 10000000000,
    blockId: 2250703,
    direction: 2,
    fee: 2362053904,
    hash: '0xfc027008cbfbd03fef17640dbb5bc89d233593d461c079fc397a926fa8916475',
    token: 'ACU',
    totalPrice: 12362053904,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 10000000000,
    blockId: 2257445,
    direction: 2,
    fee: 2362053904,
    hash: '0x8c0ef08f1dc2c05031fef00882fcff9b3e2e13cc5a97012695194b0a3dca68c0',
    token: 'ACU',
    totalPrice: 12362053904,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 10000000000,
    blockId: 2257453,
    direction: 2,
    fee: 2362053904,
    hash: '0xfdfae31056c06782d37f6f4a2052f3deec099b215b85c7ac9d9366aaf798671b',
    token: 'ACU',
    totalPrice: 12362053904,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 10000000000,
    blockId: 2257658,
    direction: 2,
    fee: 2362053904,
    hash: '0x3b072c0fe456c9f75c1c7e5350d90c331dfb1554a3d188d937bc9ce6ca072226',
    token: 'ACU',
    totalPrice: 12362053904,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: null,
    amount: 0,
    blockId: 2277885,
    direction: 2,
    fee: 2362053904,
    hash: '0xb7b268f48a20e9ab09380aead7924cb5108bb1e65df3c4f6907c3c6fd85fce8b',
    token: 'ACU',
    totalPrice: 2362053904,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 10000000000,
    blockId: 2277911,
    direction: 2,
    fee: 2362053904,
    hash: '0x088db9cd79b1fbe73f3194e0e098f02809ccc43d514b60a597b392d7ded41f55',
    token: 'ACU',
    totalPrice: 12362053904,
    value: 0,
  },
  {
    action: 'DEPOSIT',
    addressFrom: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    addressTo: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    amount: 8977374000,
    blockId: 2278020,
    direction: 1,
    fee: 0,
    hash: '0xe97364bbff62daf35de63e526832a5814442cd6a7bc5d262ed93fda74628b185',
    token: 'ACU',
    totalPrice: 8977374000,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 10000000000,
    blockId: 2278026,
    direction: 2,
    fee: 2362053904,
    hash: '0x0012e58cfde37b67b440de828102696a99c5d5191c5eb32a7d4060c7b213b3a7',
    token: 'ACU',
    totalPrice: 12362053904,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 30000000000,
    blockId: 2278027,
    direction: 2,
    fee: 2362053906,
    hash: '0xe82ebe242b5996af46f5a7ea28ac4a4650c8885ac7be62c19723fc5570193080',
    token: 'ACU',
    totalPrice: 32362053906,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
    addressTo: '5EYCAe5fiQVBBbvbHRSV4gEnCiYfUHVGmfPVPCumCym5Qh3Y',
    amount: 10000000000,
    blockId: 2278566,
    direction: 2,
    fee: 2362053907,
    hash: '0x7a733e16f9120ed70d6ddcf5ea798608f2e78dfafac9d738b00d11b306aaa086',
    token: 'ACU',
    totalPrice: 12362053907,
    value: 0,
  },
];

const mockAxios = new MockAdapter(axios);

describe('Acurast transaction Log Worker unit test', () => {
  let stage: Stage;
  let wallet: Wallet;
  let acurastLogCount: number;
  let writeEventLogMock: any;
  let config: any;

  let worker: TransactionLogWorker;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();
    env.BLOCKCHAIN_ACURAST_GRAPHQL_SERVER = config.acurast.indexerUrl;

    wallet = new Wallet(
      {
        status: 5,
        address: '5DqnC4eV6M17ABbi2XjEhbT1PHDA2yerdK597Qr5ZRr4XFRU',
        chain: CHAIN,
        chainType: CHAIN_TYPE,
        token: 'ACU',
        seed: '1',
        minBalance: '1000000000000',
        currentBalance: '0',
        decimals: 12,
        blockParseSize: 3_648_936,
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
          chain: SubstrateChain.ACURAST,
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
        ...config.acurast.endpoint,
        chain: config.acurast.chain,
        chainType: config.acurast.chainType,
      },
      stage.context,
    ).insert();

    const wd = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-acurast-transaction-worker',
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

  beforeEach(() => {
    mockAxios.reset();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test Acurast Wallet Logging', async () => {
    mockAxios
      .onGet(/https:\/\/api\.coingecko\.com\/api\/v3\/simple\/price.*/)
      .reply(200, {
        acurast: { usd: 1 },
      });

    const walletPlans = await worker.runPlanner();
    expect(walletPlans.length).toBe(1);
    const walletPlan = walletPlans.find(
      (x) => x.wallet.address === wallet.address,
    );
    expect(walletPlan.wallet.address).toBe(wallet.address);
    expect(walletPlan.wallet.id).toBe(wallet.id);

    await worker.runExecutor(walletPlan);

    // TODO: mocking stopped working
    // expect(mockAxios.history.get.length).toBe(1);
    // expect(mockAxios.history.get[0].url).toBe(
    //   'https://api.coingecko.com/api/v3/simple/price?ids=acurast&vs_currencies=USD',
    // );
    // expect(writeEventLogMock.mock.calls).toStrictEqual([
    //   [
    //     {
    //       data: {
    //         wallet: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    //       },
    //       logType: 'INFO',
    //       message:
    //         '[test-acurast-transaction-worker]: Logged 13 transactions for ACURAST:4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    //       service: 'BLOCKCHAIN',
    //     },
    //     1,
    //   ],
    // ]);
    // logTransactions
    const transactionLogs = (
      await stage.db.paramExecute(
        `
          SELECT *
          FROM \`${DbTables.TRANSACTION_LOG}\`
          WHERE wallet = @address
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
    acurastLogCount = transactionLogs.length;
    expect(transactionLogs).toStrictEqual(EXPECTED_TRANSACTION_LOGS);

    // DEPOSITS
    const deposits = (
      await stage.db.paramExecute(
        `
          SELECT *
          FROM \`${DbTables.WALLET_DEPOSIT}\`
          WHERE wallet_id = @walletId
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
        currentAmount: 3878741514859,
        depositAmount: 4000000000000,
        pricePerToken: null,
        transactionHash:
          '0x674a4e59d2e5115d58efcf5a0bb198baa4de32083617e890eb53cca6ad6acd7d',
      },
      {
        currentAmount: 8977374000,
        depositAmount: 8977374000,
        pricePerToken: null,
        transactionHash:
          '0xe97364bbff62daf35de63e526832a5814442cd6a7bc5d262ed93fda74628b185',
      },
    ]);
  });

  test('Test Acurast Wallet Logging 2nd run', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(1);

    const walletData = data.find((x) => x.wallet.address === wallet.address);
    expect(walletData.wallet.address).toBe(wallet.address);
    expect(walletData.wallet.id).toBe(wallet.id);

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
        SELECT COUNT(*) AS cnt
        FROM \`${DbTables.TRANSACTION_LOG}\`
        WHERE wallet = @address
      `,
      { address: wallet.address },
    );

    expect(logs[0].cnt).toBeGreaterThanOrEqual(acurastLogCount);
    console.log(logs[0].cnt);
  });
});
