import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../test/setup';
import { Wallet } from '../common/models/wallet';
import { DbTables } from '../config/types';
import { TransactionLogWorker } from './transaction-log-worker';

import * as fs from 'fs/promises';
import { Endpoint } from '../common/models/endpoint';

describe('Transaction Log Worker unit test', () => {
  let stage: Stage;
  let crustWallet: Wallet;
  let crustLogCount: number;
  let moonbaseLogCount: number;
  let moonbaseWallet: Wallet;
  let worker: TransactionLogWorker;
  const batchLimit = 1000;

  beforeAll(async () => {
    stage = await setupTest();

    crustWallet = new Wallet(
      {
        status: 5,
        address: 'cTHA4D34PHTD5jkK68tbyLakwnC6mYWgUEq6pA1kSqAeUtpH1',
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
        seed: '1',
        minBalance: '5000000000000',
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
      { parameters: { batchLimit } },
    );
    worker = new TransactionLogWorker(
      wd,
      stage.context,
      QueueWorkerType.PLANNER,
      '',
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test Crust Wallet Logging', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(2);

    const walletData = data.find(
      (x) => x.wallet.address === crustWallet.address,
    );
    expect(walletData.wallet.address).toBe(crustWallet.address);

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
      SELECT COUNT(*) AS cnt 
      FROM \`${DbTables.TRANSACTION_LOG}\`
      WHERE wallet = @address
      `,
      { address: crustWallet.address },
    );

    crustLogCount = logs[0].cnt;
    expect(crustLogCount).toBeGreaterThan(0);
    expect(crustLogCount).toBeLessThanOrEqual(batchLimit);
    console.log(crustLogCount);
  });
  test('Test Crust Wallet Logging 2nd run', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(2);

    const walletData = data.find(
      (x) => x.wallet.address === crustWallet.address,
    );
    expect(walletData.wallet.address).toBe(crustWallet.address);

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
      SELECT COUNT(*) AS cnt 
      FROM \`${DbTables.TRANSACTION_LOG}\`
      WHERE wallet = @address
      `,
      { address: crustWallet.address },
    );

    expect(logs[0].cnt).toBeGreaterThan(crustLogCount);
    console.log(logs[0].cnt);
  });

  test('Test Moonbase Wallet Logging', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(2);

    const walletData = data.find(
      (x) => x.wallet.address === moonbaseWallet.address,
    );
    expect(walletData.wallet.address).toBe(moonbaseWallet.address);

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
    expect(moonbaseLogCount).toBeGreaterThan(0);
    expect(moonbaseLogCount).toBeLessThanOrEqual(batchLimit);
    console.log(moonbaseLogCount);
  });
  test('Test Moonbase Wallet Logging 2nd run', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(2);

    const walletData = data.find(
      (x) => x.wallet.address === moonbaseWallet.address,
    );
    expect(walletData.wallet.address).toBe(moonbaseWallet.address);

    await worker.runExecutor(walletData);

    const logs = await stage.db.paramExecute(
      `
      SELECT COUNT(*) AS cnt 
      FROM \`${DbTables.TRANSACTION_LOG}\`
      WHERE wallet = @address
      `,
      { address: moonbaseWallet.address },
    );

    expect(logs[0].cnt).toBeGreaterThanOrEqual(moonbaseLogCount);
    console.log(logs[0].cnt);
  });
});
