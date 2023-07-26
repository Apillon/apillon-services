import {
  ChainType,
  DefaultUserRole,
  EvmChain,
  SerializeFor,
  SqlModelStatus,
  env,
} from '@apillon/lib';
import * as request from 'supertest';
import {
  createTestProject,
  createTestUser,
  startGanacheRPCServer,
  TestUser,
} from '@apillon/tests-lib';
import { ethers } from 'ethers';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../../test/helpers/setup';
import { TransactionLog } from '@apillon/blockchain/src/modules/accounting/transaction-log.model';
import { WalletTransactionSumData } from '@apillon/blockchain/src/common/dto/wallet-with-balance.dto';
import { TxAction, TxDirection } from '@apillon/blockchain/src/config/types';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
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
    await startGanacheRPCServer(stage);
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
        chain: EvmChain.MOONBASE,
        seed: '2cf25b7536db83303e3fb5b8ca50a08758ffbfd1a4e1c7a8bc7a4d6e9f9e7519',
        nonce: 0,
        nextNonce: 1,
        status: SqlModelStatus.ACTIVE,
        minBalance: 200_000_000_000,
        currentBalance: 200_000_000_001,
        decimals: 10,
      },
      stage.blockchainContext,
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
      expect(response.body.data.items.length).toBe(3); // 2 wallets from ganache test server
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
      // Set update data for object comparison to work
      wallet.createTime = testWallet.createTime;
      wallet.updateTime = testWallet.updateTime;
      wallet.updateUser = testWallet.updateUser;
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
      expect(wallet.minTokenBalance).toEqual(
        ethers.BigNumber.from(wallet.minBalance)
          .div(10 ** wallet.decimals)
          .toString(),
      );
      expect(wallet.currentTokenBalance).toEqual(
        ethers.BigNumber.from(wallet.currentBalance)
          .div(10 ** wallet.decimals)
          .toString(),
      );
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
      const data = await stage.blockchainContext.mysql.paramExecute(
        `SELECT token, decimals, minBalance from wallet WHERE id = '${testWallet.id}'`,
      );
      expect(data[0].token).toEqual(token);
      expect(data[0].decimals).toEqual(decimals);
      expect(data[0].minBalance).toEqual(minBalance);
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

      const data = await stage.blockchainContext.mysql.paramExecute(
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
