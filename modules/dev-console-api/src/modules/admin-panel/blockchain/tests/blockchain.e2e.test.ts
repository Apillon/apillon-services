import {
  ChainType,
  DefaultUserRole,
  EvmChain,
  SqlModelStatus,
  env,
} from '@apillon/lib';
import * as request from 'supertest';
import {
  createTestProject,
  createTestUser,
  TestBlockchain,
  TestUser,
} from '@apillon/tests-lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../../test/helpers/setup';
import { TransactionLog } from '@apillon/blockchain/src/modules/accounting/transaction-log.model';
import { WalletTransactionSumData } from '@apillon/blockchain/src/common/dto/wallet-with-balance.dto';
import { TxAction, TxDirection } from '@apillon/blockchain/src/config/types';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';

describe('Blockchain endpoint tests', () => {
  let stage: Stage;
  let blockchain: TestBlockchain;
  let testUser: TestUser;
  let adminTestUser: TestUser;
  let testWallet: Wallet;
  let testTransaction: TransactionLog;

  beforeAll(async () => {
    stage = await setupTest(
      env.ADMIN_CONSOLE_API_PORT_TEST,
      env.ADMIN_CONSOLE_API_HOST_TEST,
    );

    blockchain = TestBlockchain.fromStage(stage, EvmChain.MOONBEAM);
    await blockchain.start();

    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    adminTestUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.ADMIN,
    );

    testWallet = new Wallet(
      {
        address: blockchain.getWalletAddress(0),
        chainType: ChainType.EVM,
        chain: EvmChain.MOONBEAM,
        seed: blockchain.getWalletPrivateKey(0),
        nonce: 0,
        nextNonce: 1,
        status: SqlModelStatus.ACTIVE,
        minBalance: '200000000000',
        currentBalance: '200000000001',
        decimals: 10,
      },
      stage.context.blockchain,
    );
    await testWallet.checkAndUpdateBalance();
    testWallet.calculateTokenBalance();
    await testWallet.insert();
    testTransaction = new TransactionLog(
      {
        wallet: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
        action: TxAction.DEPOSIT,
        chainType: ChainType.EVM,
        chain: EvmChain.MOONBEAM,
        blockId: 100,
        direction: TxDirection.INCOME,
        hash: '1234567890',
        token: 'ETH',
        amount: 1,
        fee: 0.01,
        totalPrice: 1.01,
        status: SqlModelStatus.ACTIVE,
        ts: new Date(),
      },
      stage.context.blockchain,
    );
    await testTransaction.insert();
    await createTestProject(testUser, stage);
  });
  afterAll(async () => {
    await blockchain.stop();
    await releaseStage(stage);
  });
  describe('Wallets GET tests', () => {
    test('Get all wallets (as list)', async () => {
      const response = await request(stage.http)
        .get('/admin-panel/blockchain/wallets/')
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2); // 1 wallet from ganache test server
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items.at(-1)?.address?.toLowerCase()).toEqual(
        testWallet.address?.toLowerCase(),
      );
    });
    test('Get a single wallet', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      const wallet = response.body.data;
      expect(wallet?.id).toBeTruthy();
      // Set generic data for object comparison to work
      [
        'createTime',
        'updateTime',
        'createUser',
        'updateUser',
        'tableName',
      ].forEach((prop) => (wallet[prop] = testWallet[prop]));
      delete wallet.isBelowThreshold;
      expect(wallet).toMatchObject(testWallet);
      const transactionSumDataProps: Array<keyof WalletTransactionSumData> = [
        'totalFeeTransaction',
        'totalAmountDeposit',
        'totalAmountTransaction',
        'totalPriceDeposit',
        'totalValueDeposit',
        'totalValueTransaction',
      ];
      transactionSumDataProps.forEach((prop) =>
        expect(typeof wallet[prop]).toBe('number'),
      );
      expect(wallet.minTokenBalance).toEqual('20.0000');
      expect(wallet.currentTokenBalance).toEqual('0.0000');
    });
    test('Non-admin user should NOT be able to get a wallet', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });
  });
  describe('Update wallet tests', () => {
    test(`Update a wallet's data`, async () => {
      const minBalance = 100_000_000_000;
      const decimals = 9;
      const token = 'GLMR';
      const response = await request(stage.http)
        .patch(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`)
        .send({ minBalance, decimals, token });
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(+response.body.data.minBalance).toEqual(minBalance);
      expect(response.body.data.decimals).toEqual(decimals);
      expect(response.body.data.token).toEqual(token);
      const data = await stage.context.blockchain.mysql.paramExecute(
        `SELECT token, decimals, minBalance from wallet WHERE id = '${testWallet.id}'`,
      );
      expect(data[0].token).toEqual(token);
      expect(data[0].decimals).toEqual(decimals);
      expect(data[0].minBalance).toEqual(minBalance);
    });
    test(`Set a wallet's status to inactive`, async () => {
      const status = SqlModelStatus.INACTIVE;
      const response = await request(stage.http)
        .patch(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`)
        .send({ status });
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.status).toEqual(status);
      const data = await stage.context.blockchain.mysql.paramExecute(
        `SELECT status from wallet WHERE id = '${testWallet.id}'`,
      );
      expect(data[0].status).toEqual(status);
    });
    test('Non-admin user should NOT be able to update a wallet', async () => {
      const response = await request(stage.http)
        .patch(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ minBalance: 10 });
      expect(response.status).toBe(403);
    });
  });
  describe('Wallet Transactions GET tests', () => {
    test('Get all transactions for a wallet (as list)', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/blockchain/wallets/${testWallet.id}/transactions`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toEqual(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.wallet).toEqual(testWallet.address);
    });
  });
  describe('Transactions PATCH tests', () => {
    test('Update a transaction', async () => {
      const value = 1.05;
      const description = 'test123';
      const response = await request(stage.http)
        .patch(
          `/admin-panel/blockchain/wallets/${testWallet.id}/transactions/${testTransaction.id}`,
        )
        .set('Authorization', `Bearer ${adminTestUser.token}`)
        .send({ value, description });
      expect(response.status).toBe(200);
      expect(response.body.data.id).toEqual(testTransaction.id);
      expect(response.body.data.value).toBe(1.05);
      expect(response.body.data.description).toBe('test123');
      const data = await stage.context.blockchain.mysql.paramExecute(
        `SELECT value, description from transaction_log WHERE id = '${testTransaction.id}'`,
      );
      expect(data[0]?.value).toBe(value);
      expect(data[0]?.description).toBe(description);
    });
    test('Non-admin user should NOT be able to update a transaction', async () => {
      const response = await request(stage.http)
        .patch(
          `/admin-panel/blockchain/wallets/${testWallet.id}/transactions/${testTransaction.id}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          status: 'completed',
        });
      expect(response.status).toBe(403);
    });
  });
});
