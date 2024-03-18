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

describe('Transaction Accounting unit tests', () => {
  let stage: Stage;
  let worker: TransactionLogWorker;

  let crustWallet: Wallet;
  let kiltWallet: Wallet;
  const crustAddress = 'cTJp5A3DSBq5FQm55gxsXbuYutnghHkLPWYNowLG2E1wudbuj';
  const kiltAddress = '4opuc6SYnkBoeT5R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn';

  beforeAll(async () => {
    stage = await setupTest();

    crustWallet = new Wallet(
      {
        status: 5,
        address: crustAddress,
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
        address: kiltAddress,
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
      // 100 Crust
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          direction: TxDirection.INCOME,
          wallet: crustAddress,
          hash: '1',
          amount: 100_000_000_000_000,
        },
        stage.context,
      ),
      // 200 Crust
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          direction: TxDirection.INCOME,
          wallet: crustAddress,
          hash: '2',
          amount: 200_000_000_000_000,
        },
        stage.context,
      ),
      // 30 Kilt
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          direction: TxDirection.INCOME,
          wallet: kiltAddress,
          hash: '3',
          amount: 30_000_000_000_000_000,
        },
        stage.context,
      ),
      // 20 Kilt
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          direction: TxDirection.INCOME,
          wallet: kiltAddress,
          hash: '4',
          amount: 20_000_000_000_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: kiltAddress,
          hash: '5',
          amount: 20_000_000_000_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: kiltAddress,
          hash: '6',
          amount: 20_000_000_000_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: crustAddress,
          hash: '7',
          amount: 30_000_000_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: crustAddress,
          hash: '8',
          amount: 70_000_000_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          direction: TxDirection.COST,
          wallet: crustAddress,
          hash: '9',
          amount: 130_000_000_000_000,
        },
        stage.context,
      ),
    ].map((t) => t.calculateTotalPrice());

    await worker.processWalletDepositAmounts(crustWallet, transactions);
    await worker.processWalletDepositAmounts(kiltWallet, transactions);
    const walletDeposits = await stage.context.mysql.paramExecute(
      `SELECT * FROM ${DbTables.WALLET_DEPOSIT}`,
    );

    expect(walletDeposits).toHaveLength(4);
    expect(walletDeposits.every((w) => !!w.pricePerToken)).toBeTruthy();

    const crustDeposits = walletDeposits.filter((d) => d.wallet_id === 1);
    expect(crustDeposits).toHaveLength(2);
    expect(crustDeposits[0].depositAmount).toEqual(100_000_000_000_000);
    expect(crustDeposits[1].depositAmount).toEqual(200_000_000_000_000);
    expect(crustDeposits.every((x) => x.currentAmount === 0)); // Whole deposit balance spent

    const kiltDeposits = walletDeposits.filter((d) => d.wallet_id === 2);
    expect(kiltDeposits[0].depositAmount).toEqual(30_000_000_000_000_000);
    expect(kiltDeposits[0].currentAmount).toEqual(0);

    expect(kiltDeposits[1].depositAmount).toEqual(20_000_000_000_000_000);
    expect(kiltDeposits[1].currentAmount).toEqual(10_000_000_000_000_000);
  });
});
