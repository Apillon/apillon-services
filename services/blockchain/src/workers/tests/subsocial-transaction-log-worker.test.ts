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
  const CHAIN = SubstrateChain.SUBSOCIAL;
  const TRANSACTION_HASHES = [
    '0x97ed404dd962939e8bcaf509fb0955dd6cf3c873cd4f1de0cb200836f50022c8',
  ];
  const EXPECTED_TRANSACTION_LOGS = [
    {
      action: 'TRANSACTION',
      addressFrom: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
      addressTo: null,
      amount: 0,
      blockId: 4755753,
      direction: 2,
      fee: 301727840,
      hash: '0x97ed404dd962939e8bcaf509fb0955dd6cf3c873cd4f1de0cb200836f50022c8',
      token: 'SUB',
      totalPrice: 301727840,
      value: 0.0301727840,
    }
  ];
  
  const mockAxios = new MockAdapter(axios);
  
  describe('Subsocial transaction Log Worker unit test', () => {
    let stage: Stage;
    let wallet: Wallet;
    let phalaLogCount: number;
    let writeEventLogMock: any;
  
    let worker: TransactionLogWorker;
  
    beforeAll(async () => {
      stage = await setupTest();
      env.BLOCKCHAIN_SUBSOCIAL_GRAPHQL_SERVER = 'http://3.251.2.33:8087/graphql';
  
      wallet = new Wallet(
        {
          status: 5,
          address: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
          chain: CHAIN,
          chainType: CHAIN_TYPE,
          token: 'SUB',
          seed: '1',
          minBalance: '10000000000',
          currentBalance: '0',
          decimals: 10,
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
            chain: SubstrateChain.SUBSOCIAL,
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
          url: 'wss://para.f3joule.space',
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
        'test-subsocial-transaction-worker',
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
  
    test('Test Subsocial Wallet Logging', async () => {
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
          sub: { usd: 1 },
        });
  
      await worker.runExecutor(walletPlan);
  
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe(
        'https://api.coingecko.com/api/v3/simple/price?ids=sub&vs_currencies=USD',
      );

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
  