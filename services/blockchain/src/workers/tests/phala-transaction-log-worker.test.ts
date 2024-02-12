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

const CHAIN_TYPE = ChainType.SUBSTRATE;
const CHAIN = SubstrateChain.PHALA;
const TRANSACTION_HASHES = [
  '0x760c028db1e102bde247969e87395b5e9ad2dfac21f37ad68c0dd332cf06dad6',
  '0xd723363ab2542e9d6e56f5b547fecf349a273dd77f03595fdfd57826ca2e8a5e',
  '0xb5bb1f53ca7359e2e0765577800cb8cbb0da7f1d4a8f0578fa44f2fc416ae578',
  '0xf893908cc69287297d16171bf26d2d9508549920b9edd2eae2a3ba8ec71e54e0',
  '0x07301e10488bdbaddda3ce0656ffb42be2b4aacc9b6e4df2ecc308bd5cf2fe6c',
  '0x39bcd8628d861217d58966df6a9ae10281d85bd5e9d085d89588bcf82784fb5d',
  '0x81633b24e22b01828ee4315bf1200fded1f16365375563b3fcc2a9e8722daae6',
  '0xae9e88a80362be2d8086ce21359a792e138b8b947162a193bc3b164d34e7dd17',
  '0xe7657fd2b5d8af8caf0ed9cbd84bc2af10b2aadc1c2136e3cbfc4b8cac66699c',
  '0xaad402d50ef42b7cf1060e58aa7e25250e792cf092ec5d7ebc3374889b5d598d',
  '0x787f1198e3eb994e7246448a6cc936a4c52a41583d1e95cb3293f7cc40133869',
  '0x491b55cca50971b198ef1a328e4b04ab6dc9746e069d13986ba09e1a4fc8e69d',
  '0x5deb3c3fbb059e472aa15033b55a1c8c1d3b06c977dbcc005c54f02fbb264d9a',
];
const EXPECTED_TRANSACTION_LOGS = [
  {
    action: 'DEPOSIT',
    addressFrom: '3zvHc5FC4HzxcjheTmwCimsJRddk6txRe8HJFyYV9U179Eam',
    addressTo: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    amount: 80000000000000,
    blockId: 3513070,
    direction: 1,
    fee: 0,
    hash: '0x760c028db1e102bde247969e87395b5e9ad2dfac21f37ad68c0dd332cf06dad6',
    token: 'PHA',
    totalPrice: 80000000000000,
    value: 80,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: '43ZYyLdwvndktDGvTTdF7nBfVD4y5GEKdpeDhFFUGXcFipAx',
    amount: 10000000001,
    blockId: 3513453,
    direction: 2,
    fee: 1970000000,
    hash: '0xd723363ab2542e9d6e56f5b547fecf349a273dd77f03595fdfd57826ca2e8a5e',
    token: 'PHA',
    totalPrice: 11970000001,
    value: 0.012,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: null,
    amount: 0,
    blockId: 3513493,
    direction: 2,
    fee: 2990000000,
    hash: '0xb5bb1f53ca7359e2e0765577800cb8cbb0da7f1d4a8f0578fa44f2fc416ae578',
    token: 'PHA',
    totalPrice: 2990000000,
    value: 0.003,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: null,
    amount: 0,
    blockId: 3515158,
    direction: 2,
    fee: 2990000000,
    hash: '0xf893908cc69287297d16171bf26d2d9508549920b9edd2eae2a3ba8ec71e54e0',
    token: 'PHA',
    totalPrice: 2990000000,
    value: 0.003,
  },
  {
    action: 'DEPOSIT',
    addressFrom: '3zvHc5FC4HzxcjheTmwCimsJRddk6txRe8HJFyYV9U179Eam',
    addressTo: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    amount: 560000000000000,
    blockId: 3518530,
    direction: 1,
    fee: 0,
    hash: '0x07301e10488bdbaddda3ce0656ffb42be2b4aacc9b6e4df2ecc308bd5cf2fe6c',
    token: 'PHA',
    totalPrice: 560000000000000,
    value: 560,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: null,
    amount: 0,
    blockId: 3547574,
    direction: 2,
    fee: 2990000000,
    hash: '0x39bcd8628d861217d58966df6a9ae10281d85bd5e9d085d89588bcf82784fb5d',
    token: 'PHA',
    totalPrice: 2990000000,
    value: 0.003,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: null,
    amount: 0,
    blockId: 3547574,
    direction: 2,
    fee: 2990000000,
    hash: '0x81633b24e22b01828ee4315bf1200fded1f16365375563b3fcc2a9e8722daae6',
    token: 'PHA',
    totalPrice: 2990000000,
    value: 0.003,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: null,
    amount: 0,
    blockId: 3547580,
    direction: 2,
    fee: 2990000000,
    hash: '0xae9e88a80362be2d8086ce21359a792e138b8b947162a193bc3b164d34e7dd17',
    token: 'PHA',
    totalPrice: 2990000000,
    value: 0.003,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: '43aTrvUCv8HQKHUzAR7SEt1BdFgLKpJPTNSMaY3naLo3fXPd',
    amount: 1000000000000,
    blockId: 3599014,
    direction: 2,
    fee: 1560022167,
    hash: '0xe7657fd2b5d8af8caf0ed9cbd84bc2af10b2aadc1c2136e3cbfc4b8cac66699c',
    token: 'PHA',
    totalPrice: 1001560022167,
    value: 1.0016,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: '43ZYyLdwvndktDGvTTdF7nBfVD4y5GEKdpeDhFFUGXcFipAx',
    amount: 10000000001,
    blockId: 3604358,
    direction: 2,
    fee: 1970000000,
    hash: '0xaad402d50ef42b7cf1060e58aa7e25250e792cf092ec5d7ebc3374889b5d598d',
    token: 'PHA',
    totalPrice: 11970000001,
    value: 0.012,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: '43ZYyLdwvndktDGvTTdF7nBfVD4y5GEKdpeDhFFUGXcFipAx',
    amount: 10000000001,
    blockId: 3604510,
    direction: 2,
    fee: 1970000000,
    hash: '0x787f1198e3eb994e7246448a6cc936a4c52a41583d1e95cb3293f7cc40133869',
    token: 'PHA',
    totalPrice: 11970000001,
    value: 0.012,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: null,
    amount: 0,
    blockId: 3648446,
    direction: 2,
    fee: 3460000000,
    hash: '0x491b55cca50971b198ef1a328e4b04ab6dc9746e069d13986ba09e1a4fc8e69d',
    token: 'PHA',
    totalPrice: 3460000000,
    value: 0.0035,
  },
  {
    action: 'TRANSACTION',
    addressFrom: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
    addressTo: null,
    amount: 0,
    blockId: 3648936,
    direction: 2,
    fee: 3460000000,
    hash: '0x5deb3c3fbb059e472aa15033b55a1c8c1d3b06c977dbcc005c54f02fbb264d9a',
    token: 'PHA',
    totalPrice: 3460000000,
    value: 0.0035,
  },
];

const mockAxios = new MockAdapter(axios);

describe('Phala transaction Log Worker unit test', () => {
  let stage: Stage;
  let wallet: Wallet;
  let phalaLogCount: number;
  let writeEventLogMock: any;

  let worker: TransactionLogWorker;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER = 'http://3.251.2.33:8086/graphql';

    wallet = new Wallet(
      {
        status: 5,
        address: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
        chain: CHAIN,
        chainType: CHAIN_TYPE,
        token: 'PHA',
        seed: '1',
        minBalance: '5000000000000',
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
          chain: SubstrateChain.PHALA,
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
        url: 'wss://poc6.phala.network/ws',
        chain: CHAIN,
        chainType: CHAIN_TYPE,
      },
      stage.context,
    ).insert();

    const wd = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-phala-transaction-worker',
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

  test('Test Phala Wallet Logging', async () => {
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
        pha: { usd: 1 },
      });

    await worker.runExecutor(walletPlan);

    expect(mockAxios.history.get.length).toBe(1);
    expect(mockAxios.history.get[0].url).toBe(
      'https://api.coingecko.com/api/v3/simple/price?ids=pha&vs_currencies=USD',
    );
    expect(writeEventLogMock.mock.calls).toStrictEqual([
      [
        {
          data: {
            wallet: '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
          },
          logType: 'INFO',
          message:
            '[test-phala-transaction-worker]: Logged 13 transactions for PHALA:4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk',
          service: 'BLOCKCHAIN',
        },
        1,
      ],
    ]);
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
    phalaLogCount = transactionLogs.length;
    expect(transactionLogs).toStrictEqual(EXPECTED_TRANSACTION_LOGS);

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
        currentAmount: 78940659977830,
        depositAmount: 80000000000000,
        pricePerToken: 1,
        transactionHash:
          '0x760c028db1e102bde247969e87395b5e9ad2dfac21f37ad68c0dd332cf06dad6',
      },
      {
        currentAmount: 560000000000000,
        depositAmount: 560000000000000,
        pricePerToken: 1,
        transactionHash:
          '0x07301e10488bdbaddda3ce0656ffb42be2b4aacc9b6e4df2ecc308bd5cf2fe6c',
      },
    ]);
  });

  test('Test Phala Wallet Logging 2nd run', async () => {
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

    expect(logs[0].cnt).toBeGreaterThanOrEqual(phalaLogCount);
    console.log(logs[0].cnt);
  });
});
