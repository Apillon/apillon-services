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
const CHAIN = SubstrateChain.ASTAR;
const TRANSACTION_HASHES = [
  '0x3cd9f712ffa79ff30082df10b22dc40bed93514197dbbc5cad747fea1e20f2d4',
  '0xec25e74ed028922b15a664dd2da7bacae2e28441fbdba133d76f9def451ebf72',
  '0xcad489b2045366ce83d0817258c8c3530dbdd6b8fc674dec93cb9b8feb3c5542',
  '0x379a8e7fbccbebfccf1c7566e2a163a9b71e217ea85c2f06fc37f881593b2c2d',
  '0xc652dfd71f5236fa1824afe1d7303074ed79230174112c5c9e23885a1b7d3728',
  '0xd3efaf9ccfcf3d2de1a9170ec11b596bab301e62564977a96d3144910e92d515',
  '0xdeab858914aef2caca6aa51602402c7373b57d33314f7482fbf0212c4138cd21',
  '0x410cbf2825af899044e0db1b0aff56e28767582d964670cd261fd491a8111b4d',
  '0xde7e2a7eb8499c8beb6435bd1d64648f33f66ab4d9563ef07161a59c255a20bf',
  '0x9782c23b250ce8bfd567e3c2a7d3294bc468216ef39338c67861690741b3a8cd',
  '0x7a5eb3ed369c6bdcb30e2c74a7bc39f93d46e08579b96c7aac168f414cf17890',
  '0x95e20016ee18b47d0be173589a1665c19e8833aed0c3694a8a871f70a1cc6b23',
  '0x222170792a8350e177e91a97f8b408bd6b87d0e90adc72fa1f90712beb17f8eb',
  '0x19dd5f95649d812d8ba9d53d1b44c1d3796f3eccdf78e6cecdb61cde80036077',
  '0x5d2f0a7af443a56a244beb4e7a8de8cd82aa17e535f79b4e943683f446c192b0',
  '0xcfac5a272e2999ac139279c33b50ec4b37736bdc8e8e03fe7931d3a264214e98',
  '0xa0a3896b79529b5104d9b58adfc2013da48fc58d1a687e18136d33912d410526',
];
const EXPECTED_TRANSACTION_LOGS = [
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'ZAz3Dqcodmz4hcYGCqCp3oyQwNnE4pdsCFgss5fksNP8jE1',
    amount: 1000000,
    blockId: 5964472,
    direction: 2,
    fee: 151253140921909920,
    hash: '0x3cd9f712ffa79ff30082df10b22dc40bed93514197dbbc5cad747fea1e20f2d4',
    token: 'ASTR',
    totalPrice: 151253140922909920,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'be7JaWwuopcmZTcBXhj8wUfekDQj4fWkYraR3uQTdocDPZd',
    amount: 1000000,
    blockId: 5964535,
    direction: 2,
    fee: 152035203099518530,
    hash: '0xc652dfd71f5236fa1824afe1d7303074ed79230174112c5c9e23885a1b7d3728',
    token: 'ASTR',
    totalPrice: 152035203100518530,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 138127783378747550,
    blockId: 5964545,
    direction: 2,
    fee: 193780824977763700,
    hash: '0xd3efaf9ccfcf3d2de1a9170ec11b596bab301e62564977a96d3144910e92d515',
    token: 'ASTR',
    totalPrice: 331908608356511300,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 0,
    blockId: 5964606,
    direction: 2,
    fee: 117415926874969860,
    hash: '0xdeab858914aef2caca6aa51602402c7373b57d33314f7482fbf0212c4138cd21',
    token: 'ASTR',
    totalPrice: 117415926874969860,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'bYbDZWULJFmfb16D8c4qUE1WMhDhNHyH9FM1nf19JHbP6Xd',
    amount: 1000000,
    blockId: 5966405,
    direction: 2,
    fee: 152405560228173700,
    hash: '0x410cbf2825af899044e0db1b0aff56e28767582d964670cd261fd491a8111b4d',
    token: 'ASTR',
    totalPrice: 152405560229173700,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'XSSjSfiiGokhX138F57YHS5v9Lnag8ucrhz2FvmGne6TVde',
    amount: 1000000,
    blockId: 5966405,
    direction: 2,
    fee: 152405560228173700,
    hash: '0xde7e2a7eb8499c8beb6435bd1d64648f33f66ab4d9563ef07161a59c255a20bf',
    token: 'ASTR',
    totalPrice: 152405560229173700,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 138127783378747550,
    blockId: 5966418,
    direction: 2,
    fee: 193780824977763700,
    hash: '0x9782c23b250ce8bfd567e3c2a7d3294bc468216ef39338c67861690741b3a8cd',
    token: 'ASTR',
    totalPrice: 331908608356511300,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 138120411153178100,
    blockId: 5966557,
    direction: 2,
    fee: 193773452752194270,
    hash: '0x7a5eb3ed369c6bdcb30e2c74a7bc39f93d46e08579b96c7aac168f414cf17890',
    token: 'ASTR',
    totalPrice: 331893863905372400,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 62042081630949890,
    blockId: 5966895,
    direction: 2,
    fee: 117272123229966080,
    hash: '0x95e20016ee18b47d0be173589a1665c19e8833aed0c3694a8a871f70a1cc6b23',
    token: 'ASTR',
    totalPrice: 179314204860915970,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'aPnXCxphyqW6YQyba64NfywENLgLjq1DVjEEZUQ8UaJ4iVD',
    amount: 1000000,
    blockId: 5969620,
    direction: 2,
    fee: 152405560228173700,
    hash: '0x222170792a8350e177e91a97f8b408bd6b87d0e90adc72fa1f90712beb17f8eb',
    token: 'ASTR',
    totalPrice: 152405560229173700,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 138127783378747550,
    blockId: 5969637,
    direction: 2,
    fee: 193780824977763700,
    hash: '0x19dd5f95649d812d8ba9d53d1b44c1d3796f3eccdf78e6cecdb61cde80036077',
    token: 'ASTR',
    totalPrice: 331908608356511300,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'XwK8rXjFPAr8NbGgwYy53VbhzxtX4nSjP8mUa2Vwj6MEkWH',
    amount: 1000000,
    blockId: 5970090,
    direction: 2,
    fee: 152405560228173700,
    hash: '0x5d2f0a7af443a56a244beb4e7a8de8cd82aa17e535f79b4e943683f446c192b0',
    token: 'ASTR',
    totalPrice: 152405560229173700,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'Z4NstCUTFDaYmk3rTpxtDhz39qDVBbDDw9if6PFRLsVrL4e',
    amount: 1000000,
    blockId: 5970730,
    direction: 2,
    fee: 152405560228173700,
    hash: '0xcfac5a272e2999ac139279c33b50ec4b37736bdc8e8e03fe7931d3a264214e98',
    token: 'ASTR',
    totalPrice: 152405560229173700,
    value: 0,
  },
  {
    action: 'WITHDRAWAL',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: 'ZG1CMhqqMZXzab2TQva233YmUSAh8SW5rwvMz9XSJN8tZy9',
    amount: 1000000,
    blockId: 5970838,
    direction: 2,
    fee: 152405560228173700,
    hash: '0xa0a3896b79529b5104d9b58adfc2013da48fc58d1a687e18136d33912d410526',
    token: 'ASTR',
    totalPrice: 152405560229173700,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 0,
    blockId: 5970847,
    direction: 2,
    fee: 193780824977763700,
    hash: '0xec25e74ed028922b15a664dd2da7bacae2e28441fbdba133d76f9def451ebf72',
    token: 'ASTR',
    totalPrice: 193780824977763700,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 0,
    blockId: 5970851,
    direction: 2,
    fee: 117258577386182420,
    hash: '0xcad489b2045366ce83d0817258c8c3530dbdd6b8fc674dec93cb9b8feb3c5542',
    token: 'ASTR',
    totalPrice: 117258577386182420,
    value: 0,
  },
  {
    action: 'TRANSACTION',
    addressFrom: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    addressTo: null,
    amount: 0,
    blockId: 5970860,
    direction: 2,
    fee: 110503484471723460,
    hash: '0x379a8e7fbccbebfccf1c7566e2a163a9b71e217ea85c2f06fc37f881593b2c2d',
    token: 'ASTR',
    totalPrice: 110503484471723460,
    value: 0,
  },
  {
    action: 'DEPOSIT',
    addressFrom: 'WiXeZpx9gX9T3TRcbYanyDCk64zqaCoo1EQvssnTiywWgQB',
    addressTo: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    amount: 10000000000000000000,
    blockId: 6009080,
    direction: 1,
    fee: 0,
    hash: '0xec4be6e7b80b776c3f71c83b8f35e364ddca294660c18202d6db4a922f76fc13',
    token: 'ASTR',
    totalPrice: 10000000000000000000,
    value: 0,
  },
  {
    action: 'DEPOSIT',
    addressFrom: 'WiXeZpx9gX9T3TRcbYanyDCk64zqaCoo1EQvssnTiywWgQB',
    addressTo: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
    amount: 10000000000000000000,
    blockId: 6009084,
    direction: 1,
    fee: 0,
    hash: '0x65348bbeea40d07f4afef7ea1fb7773bdd2d3a227e989f46c6e00fa3f2394a94',
    token: 'ASTR',
    totalPrice: 10000000000000000000,
    value: 0,
  },
];

const mockAxios = new MockAdapter(axios);

describe('Astar Substrate transaction Log Worker unit test', () => {
  let stage: Stage;
  let wallet: Wallet;
  let logCount: number;
  let writeEventLogMock: any;

  let worker: TransactionLogWorker;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_ASTAR_SUBSTRATE_GRAPHQL_SERVER =
      'http://3.251.2.33:8088/graphql';

    wallet = new Wallet(
      {
        status: 5,
        address: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
        chain: CHAIN,
        chainType: CHAIN_TYPE,
        token: 'ASTR',
        seed: '1',
        minBalance: '5000000000000',
        currentBalance: '0',
        decimals: 12,
        blockParseSize: 50000,
        lastParsedBlock: 5964471,
        lastLoggedBlock: 5964471,
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
          chainType: CHAIN_TYPE,
          chain: CHAIN,
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
        url: 'wss://rpc.shibuya.astar.network',
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
      'test-astar-substrate-transaction-worker',
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

  test('Test Astar Substrate Wallet Logging', async () => {
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
      'https://api.coingecko.com/api/v3/simple/price?ids=astar&vs_currencies=USD',
    );
    expect(writeEventLogMock.mock.calls).toStrictEqual([
      [
        {
          data: {
            wallet: 'bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
          },
          logType: 'INFO',
          message:
            '[test-astar-substrate-transaction-worker]: Logged 19 transactions for ASTAR:bTdmScYtDDGg12mG1pvQ5zAooMXMK45WHBt3meGDXrNBKua',
          service: 'BLOCKCHAIN',
        },
        1,
      ],
    ]);
    // logTransactions
    const transactionLogs = (
      await stage.db.paramExecute(
        `
          SELECT *
          FROM \`${DbTables.TRANSACTION_LOG}\`
          WHERE wallet = @address
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
    logCount = transactionLogs.length;
    expect(transactionLogs).toStrictEqual(EXPECTED_TRANSACTION_LOGS);

    // DEPOSITS
    const deposits = (
      await stage.db.paramExecute(
        `
          SELECT *
          FROM \`${DbTables.WALLET_DEPOSIT}\`
          WHERE wallet_id = @walletId
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
        currentAmount: 6736385587055065000,
        depositAmount: 10000000000000000000,
        pricePerToken: null,
        transactionHash:
          '0xec4be6e7b80b776c3f71c83b8f35e364ddca294660c18202d6db4a922f76fc13',
      },
      {
        currentAmount: 10000000000000000000,
        depositAmount: 10000000000000000000,
        pricePerToken: null,
        transactionHash:
          '0x65348bbeea40d07f4afef7ea1fb7773bdd2d3a227e989f46c6e00fa3f2394a94',
      },
    ]);
  });

  test('Test Astar Substrate Wallet Logging 2nd run', async () => {
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

    expect(logs[0].cnt).toBe(logCount);
    console.log(logs[0].cnt);
  });
});
