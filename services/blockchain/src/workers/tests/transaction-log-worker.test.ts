import { ChainType, env, EvmChain, SubstrateChain } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Wallet } from '../../modules/wallet/wallet.model';
import { DbTables } from '../../config/types';
import { TransactionLogWorker } from '../transaction-log-worker';

import * as fs from 'fs/promises';
import { Endpoint } from '../../common/models/endpoint';

describe('Transaction Log Worker unit test', () => {
  let stage: Stage;
  let crustWallet: Wallet;

  let moonbaseWallet: Wallet;
  let moonbaseLogCount: number;

  let astarWallet: Wallet;
  let astarLogCount: number;

  let kiltWallet: Wallet;
  let kiltLogCount: number;

  let worker: TransactionLogWorker;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://3.251.2.33:8081/graphql';

    crustWallet = new Wallet(
      {
        status: 5,
        address: 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU',
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
        seed: '1',
        minBalance: '5000000000000',
        decimals: 12,
        blockParseSize: 10_952_561,
        lastLoggedBlock: 14042287,
      },
      stage.context,
    );

    await crustWallet.insert();

    await new Endpoint(
      {
        url: 'wss://rpc.crust.network',
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
      },
      stage.context,
    ).insert();

    moonbaseWallet = new Wallet(
      {
        status: 5,
        address: '0xba01526c6d80378a9a95f1687e9960857593983b',
        chain: EvmChain.MOONBASE,
        chainType: ChainType.EVM,
        seed: '2',
        minBalance: '14549118925859030048',
        decimals: 18,
        blockParseSize: 5_771_620,
      },
      stage.context,
    );

    await moonbaseWallet.insert();

    await new Endpoint(
      {
        url: 'https://moonbeam-alpha.api.onfinality.io/rpc?apikey=15a3df59-0a99-4216-97b4-e2d242fe64e5',
        chain: EvmChain.MOONBASE,
        chainType: ChainType.EVM,
      },
      stage.context,
    ).insert();

    astarWallet = new Wallet(
      {
        status: 5,
        address: '0x076396C9fcA4dc909DA0a53Fd264c587bEF52b48',
        chain: EvmChain.ASTAR,
        chainType: ChainType.EVM,
        minBalance: '14549118925859030048',
        seed: '3',
        decimals: 18,
      },
      stage.context,
    );

    await astarWallet.insert();

    await new Endpoint(
      {
        url: 'https://astar.api.onfinality.io/rpc?apikey=15a3df59-0a99-4216-97b4-e2d242fe64e5',
        chain: EvmChain.ASTAR,
        chainType: ChainType.EVM,
      },
      stage.context,
    ).insert();

    kiltWallet = new Wallet(
      {
        status: 5,
        address: '4sAqndzGzNYtrdAWhSSnaGptrGY1TSJ99kf5ZRwAzcPUbaTN',
        chain: SubstrateChain.KILT,
        chainType: ChainType.SUBSTRATE,
        minBalance: '2000000000000000',
        seed: '4',
        decimals: 12,
        blockParseSize: 4_277_559,
      },
      stage.context,
    );

    await kiltWallet.insert();

    await new Endpoint(
      {
        url: 'wss://spiritnet.kilt.io/parachain-public-ws',
        chain: SubstrateChain.KILT,
        chainType: ChainType.SUBSTRATE,
      },
      stage.context,
    ).insert();

    const txQSql = await fs.readFile('./test/insert_tx_q.sql');
    const queries = txQSql.toString().split('\n');
    for (const q of queries) {
      if (q.length > 1) {
        await stage.db.paramExecute(q);
      }
    }

    const wd = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-crust-transaction-worker',
      { parameters: {} },
    );
    worker = new TransactionLogWorker(
      wd,
      stage.context,
      QueueWorkerType.PLANNER,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  // test('Test case insensitive wallet address', async () => {
  //   const test1 = await new Wallet({}, stage.context).populateByAddress(
  //     EvmChain.ASTAR,
  //     ChainType.EVM,
  //     '0x076396C9fcA4dc909DA0a53Fd264c587bEF52b48',
  //   );
  //   const test2 = await new Wallet({}, stage.context).populateByAddress(
  //     EvmChain.ASTAR,
  //     ChainType.EVM,
  //     '0x076396C9fcA4dc909DA0a53Fd264c587bEF52b48'.toLowerCase(),
  //   );
  //   expect(test1.exists()).toBeTruthy();
  //   expect(test2.exists()).toBeTruthy();
  //   expect(test1.id).toBe(test2.id);
  // });

  test('Test Crust Wallet Logging', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(4);

    const walletData = data.find(
      (x) => x.wallet.address === crustWallet.address,
    );
    expect(walletData.wallet.address).toBe(crustWallet.address);
    expect(walletData.wallet.id).toBe(crustWallet.id);

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
      SELECT COUNT(*) AS cnt
      FROM \`${DbTables.TRANSACTION_LOG}\`
      WHERE wallet = @address
      `,
      { address: crustWallet.address },
    );
    expect(logs[0].cnt).toBe(238);

    const totalPriceSum = await stage.db.paramExecute(
      `
        SELECT SUM(totalPrice) AS spends
        FROM \`${DbTables.TRANSACTION_LOG}\`
        WHERE wallet = @address
        GROUP BY wallet
      `,
      { address: crustWallet.address },
    );
    expect(totalPriceSum[0].spends).toBe(279398536215);
  });

  test('Test Crust Wallet Logging 2nd run', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(4);

    const walletData = data.find(
      (x) => x.wallet.address === crustWallet.address,
    );
    expect(walletData.wallet.address).toBe(crustWallet.address);
    expect(walletData.wallet.id).toBe(crustWallet.id);

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
      SELECT COUNT(*) AS cnt
      FROM \`${DbTables.TRANSACTION_LOG}\`
      WHERE wallet = @address
      `,
      { address: crustWallet.address },
    );

    expect(logs[0].cnt).toBe(670);
    console.log(logs[0].cnt);
  });

  test('Test Moonbase Wallet Logging', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(4);

    const walletData = data.find(
      (x) =>
        x.wallet.address === moonbaseWallet.address.toLowerCase() ||
        x.wallet.address === moonbaseWallet.address,
    );
    expect(walletData.wallet.address).toBe(
      moonbaseWallet.address.toLowerCase(),
    );

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
        SELECT COUNT(*) AS cnt
        FROM \`${DbTables.TRANSACTION_LOG}\`
        WHERE wallet = @address
      `,
      { address: moonbaseWallet.address },
    );

    moonbaseLogCount = logs[0].cnt;
    expect(moonbaseLogCount).toBe(68);
    console.log(moonbaseLogCount);
  });

  // test('Test Moonbase Wallet Logging 2nd run', async () => {
  //   const data = await worker.runPlanner();
  //   expect(data.length).toBe(4);

  //   const walletData = data.find(
  //     (x) =>
  //       x.wallet.address === moonbaseWallet.address.toLowerCase() ||
  //       x.wallet.address === moonbaseWallet.address,
  //   );
  //   expect(walletData.wallet.address).toBe(
  //     moonbaseWallet.address.toLowerCase(),
  //   );

  //   await worker.runExecutor(walletData);

  //   const logs = await stage.db.paramExecute(
  //     `
  //     SELECT COUNT(*) AS cnt
  //     FROM \`${DbTables.TRANSACTION_LOG}\`
  //     WHERE wallet = @address
  //     `,
  //     { address: moonbaseWallet.address },
  //   );

  //   expect(logs[0].cnt).toBeGreaterThanOrEqual(moonbaseLogCount);
  //   console.log(logs[0].cnt);
  // });

  // test('Test Astar Wallet Logging', async () => {
  //   const data = await worker.runPlanner();
  //   expect(data.length).toBe(4);

  //   const walletData = data.find(
  //     (x) =>
  //       x.wallet.address === astarWallet.address.toLowerCase() ||
  //       x.wallet.address === astarWallet.address,
  //   );
  //   expect(
  //     walletData.wallet.address === astarWallet.address.toLowerCase() ||
  //       walletData.wallet.address === astarWallet.address,
  //   ).toBeTruthy();

  //   await worker.runExecutor(walletData);

  //   const logs = await stage.db.paramExecute(
  //     `
  //     SELECT COUNT(*) AS cnt
  //     FROM \`${DbTables.TRANSACTION_LOG}\`
  //     WHERE wallet = @address
  //     `,
  //     { address: astarWallet.address },
  //   );

  //   astarLogCount = logs[0].cnt;
  //   expect(astarLogCount).toBeGreaterThan(0);
  //   expect(astarLogCount).toBeLessThanOrEqual(batchLimit);
  //   console.log(astarLogCount);
  // });

  test('Test Kilt Wallet Logging', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(4);

    const walletData = data.find(
      (x) => x.wallet.address === kiltWallet.address,
    );
    expect(walletData.wallet.address === kiltWallet.address).toBeTruthy();

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
        SELECT COUNT(*) AS cnt
        FROM \`${DbTables.TRANSACTION_LOG}\`
        WHERE wallet = @address
      `,
      { address: kiltWallet.address },
    );

    kiltLogCount = logs[0].cnt;
    expect(kiltLogCount).toBe(121);
    console.log(kiltLogCount);

    const deposits = await stage.db.paramExecute(
      `
        SELECT COUNT(*) AS cnt
        FROM \`${DbTables.TRANSACTION_LOG}\`
        WHERE wallet = @address
          AND action ='DEPOSIT'
          AND status = 5
      `,
      { address: kiltWallet.address },
    );
    expect(deposits[0].cnt).toBe(3);

    const otherTransactions = await stage.db.paramExecute(
      `
        SELECT COUNT(*) AS cnt
        FROM \`${DbTables.TRANSACTION_LOG}\`
        WHERE wallet = @address
          AND action !='DEPOSIT'
          AND status = 5
      `,
      { address: kiltWallet.address },
    );
    expect(otherTransactions[0].cnt).toBe(49);
  });
});
