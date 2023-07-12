import {
  ChainType,
  DefaultUserRole,
  EvmChain,
  QuotaCode,
  SerializeFor,
  SqlModelStatus,
  env,
} from '@apillon/lib';
import * as request from 'supertest';
import {
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../../test/helpers/setup';
import { Wallet } from '@apillon/blockchain/src/common/models/wallet';
import { TransactionLog } from '@apillon/blockchain/src/modules/accounting/transaction-log.model';
import { TxAction, TxDirection } from '@apillon/blockchain/src/config/types';
describe('Blockchain endpoint tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let adminTestUser: TestUser;

  let testWallet: Wallet;
  let testTransaction: TransactionLog;

  beforeAll(async () => {
    stage = await setupTest(
      env.ADMIN_CONSOLE_API_PORT_TEST,
      env.ADMIN_CONSOLE_API_HOST_TEST,
    );
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );
    testWallet = new Wallet(
      {
        address: '0x25Cd0fE6953F5799AEbDa9ee445287CFb101972E',
        chainType: ChainType.EVM,
        chain: EvmChain.MOONBEAM,
        seed: '2cf25b7536db83303e3fb5b8ca50a08758ffbfd1a4e1c7a8bc7a4d6e9f9e7519',
        nonce: 0,
        nextNoce: 1,
        status: SqlModelStatus.ACTIVE,
      },
      stage.blockchainContext,
    );
    await testWallet.insert(SerializeFor.ADMIN);

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
        amount: '1',
        fee: '0.01',
        totalPrice: '1.01',
        status: SqlModelStatus.ACTIVE,
      },
      stage.blockchainContext,
    );
    await testTransaction.insert();
    await createTestProject(testUser, stage.devConsoleContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Wallets GET tests', () => {
    test('Get all wallets (as list)', async () => {
      const response = await request(stage.http)
        .get('/admin-panel/blockchain/wallets/')
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.address).toEqual(testWallet.address);
    });

    test('Get a single wallet', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data?.id).toBeTruthy();
      expect(response.body.data?.id).toEqual(testWallet.id);
      expect(response.body.data?.address).toEqual(testWallet.address);
    });

    test('Non-admin user should NOT be able to get a wallet', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Update wallet tests', () => {
    test(`Update a wallet's minBalance`, async () => {
      const minBalance = 10;
      const response = await request(stage.http)
        .patch(`/admin-panel/blockchain/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`)
        .send({ minBalance });
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(+response.body.data.minBalance).toEqual(minBalance);
      const data = await stage.blockchainContext.mysql.paramExecute(
        `SELECT minBalance from wallet WHERE id = '${testWallet.id}'`,
      );
      expect(data[0].minBalance).toBe(minBalance);
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
      const response = await request(stage.http)
        .patch(`/admin-panel/blockchain/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`)
        .send({
          totalPrice: '1.05',
          description: 'test123',
        });
      expect(response.status).toBe(200);
      expect(response.body.data.id).toEqual(testTransaction.id);
      expect(response.body.data.totalPrice).toBe('1.05');
      expect(response.body.data.description).toBe('test123');

      const data = await stage.blockchainContext.mysql.paramExecute(
        `SELECT totalPrice, description from transaction_log WHERE id = '${testTransaction.id}'`,
      );
      expect(data[0]?.totalPrice).toBe('1.05');
      expect(data[0]?.description).toBe('test123');
    });

    test('Non-admin user should NOT be able to update a transaction', async () => {
      const response = await request(stage.http)
        .patch(`/admin-panel/blockchain/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          status: 'completed',
        });
      expect(response.status).toBe(403);
    });
  });
});
