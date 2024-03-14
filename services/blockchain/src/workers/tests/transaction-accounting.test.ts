import { ChainType, SubstrateChain } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Wallet } from '../../modules/wallet/wallet.model';
import { DbTables, TxAction, TxDirection } from '../../config/types';
import { TransactionLogWorker } from '../transaction-log-worker';
import { TransactionLog } from '../../modules/accounting/transaction-log.model';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockAxios = new MockAdapter(axios);

describe('Transaction Accounting unit tests', () => {
  let stage: Stage;
  let crustWallet: Wallet;

  let kiltWallet: Wallet;

  let worker: TransactionLogWorker;

  beforeAll(async () => {
    stage = await setupTest();

    mockAxios
      .onGet(/https:\/\/api.coingecko.com\/api\/v3\/simple\/price.*/)
      .reply(200, {
        'crust-network': { usd: 1 },
        'kilt-protocol': { usd: 1 },
      });

    crustWallet = new Wallet(
      {
        status: 5,
        address: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
        seed: '1',
        minBalance: '2000000000000',
        token: 'CRU',
        decimals: 12,
      },
      stage.context,
    );

    await crustWallet.insert();

    kiltWallet = new Wallet(
      {
        status: 5,
        address: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
        chain: SubstrateChain.KILT,
        chainType: ChainType.SUBSTRATE,
        seed: '4',
        minBalance: '2000000000000000',
        token: 'KILT',
        decimals: 15,
      },
      stage.context,
    );

    await kiltWallet.insert();

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

  test('Test wallet deposits', async () => {
    const transactions = [
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          direction: TxDirection.INCOME,
          wallet: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
          hash: '1',
          amount: 100_000_000,
        },
        stage.context,
      ).calculateTotalPrice(),
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          direction: TxDirection.INCOME,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '2',
          amount: 200_000_000,
        },
        stage.context,
      ).calculateTotalPrice(),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '3',
          amount: 30_000_000,
        },
        stage.context,
      ).calculateTotalPrice(),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '4',
          amount: 30_000_000,
        },
        stage.context,
      ).calculateTotalPrice(),
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          direction: TxDirection.INCOME,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '5',
          amount: 150_000_000,
        },
        stage.context,
      ).calculateTotalPrice(),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '6',
          amount: 20_000_000,
        },
        stage.context,
      ).calculateTotalPrice(),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
          hash: '7',
          amount: 30_000_000,
        },
        stage.context,
      ).calculateTotalPrice(),
    ];

    await worker.processWalletDepositAmounts(crustWallet, transactions);
    await worker.processWalletDepositAmounts(kiltWallet, transactions);
    const walletDeposits = await stage.context.mysql.paramExecute(
      `SELECT * FROM ${DbTables.WALLET_DEPOSIT}`,
    );

    expect(walletDeposits).toHaveLength(3);
    expect(walletDeposits[0].pricePerToken).toBeTruthy();
    expect(walletDeposits[0].depositAmount).toBeTruthy();
    expect(walletDeposits[0].wallet_id).toEqual(crustWallet.id);

    expect(walletDeposits[0].currentAmount).toEqual(70000000);
    expect(walletDeposits[1].currentAmount).toEqual(200000000);
    expect(walletDeposits[2].currentAmount).toEqual(150000000);
  });

  test('Test wallet spends where we drain one deposit row to 0', async () => {
    const transactions = [
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '1',
          amount: 200_000_001,
        },
        stage.context,
      ).calculateTotalPrice(),
    ];

    await worker.processWalletDepositAmounts(kiltWallet, transactions);
    const walletDeposits = await stage.context.mysql.paramExecute(
      `SELECT *
       FROM ${DbTables.WALLET_DEPOSIT}
       WHERE wallet_id = 2`,
    );

    expect(walletDeposits).toHaveLength(2);
    expect(walletDeposits[0].currentAmount).toEqual(0);
    expect(walletDeposits[1].currentAmount).toEqual(149999999);
  });
});
