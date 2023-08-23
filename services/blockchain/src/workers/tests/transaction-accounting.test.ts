import { ChainType, SubstrateChain } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Wallet } from '../../modules/wallet/wallet.model';
import { DbTables, TxAction } from '../../config/types';
import { TransactionLogWorker } from '../transaction-log-worker';

import { TransactionLog } from '../../modules/accounting/transaction-log.model';

describe('Transaction Accounting unit tests', () => {
  let stage: Stage;
  let crustWallet: Wallet;

  let kiltWallet: Wallet;

  let worker: TransactionLogWorker;

  beforeAll(async () => {
    stage = await setupTest();

    crustWallet = new Wallet(
      {
        status: 5,
        address: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
        seed: '1',
        minBalance: '200000000000',
        token: 'CRU',
        decimals: 6,
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
        token: 'KILT',
        decimals: 6,
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
      { parameters: { batchLimit: 200 } },
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
          wallet: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
          hash: '123',
          amount: 100_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '456',
          amount: 50_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '456',
          amount: 30_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '123',
          amount: 30_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.DEPOSIT,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '456',
          amount: 60_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          wallet: '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn',
          hash: '123',
          amount: 20_000_000,
        },
        stage.context,
      ),
      new TransactionLog(
        {
          action: TxAction.TRANSACTION,
          wallet: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
          hash: '123',
          amount: 30_000_000,
        },
        stage.context,
      ),
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

    expect(walletDeposits[0].currentAmount).toEqual(70);
    expect(walletDeposits[1].currentAmount).toEqual(0);
    expect(walletDeposits[2].currentAmount).toEqual(30);
  });
});
