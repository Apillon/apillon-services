import {
  BlockchainMicroservice,
  ComputingContractType,
  PhalaClusterWalletDto,
  PhalaLogFilterDto,
  SubstrateChain,
} from '@apillon/lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { ClusterWallet } from '../../modules/computing/models/cluster-wallet.model';
import { PhalaLogWorker } from '../phala-log-worker';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../worker-executor';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { Contract } from '../../modules/computing/models/contract.model';
import { ContractAbi } from '../../modules/computing/models/contractAbi.model';
import {
  ComputingTransactionStatus,
  DbTables,
  TransactionType,
  TxAction,
  TxDirection,
} from '../../config/types';
import { expect } from '@jest/globals';
import { ClusterTransactionLog } from '../../modules/accounting/cluster-transaction-log.model';

const mockAxios = new MockAdapter(axios);

const CHAIN = SubstrateChain.PHALA;
const WALLET_ADDRESS = '4698EF9dVV5SaU9MuKpWqcdnxvvsito6Do3ARrinnuiZDdKk';
const CONTRACT_ADDRESS =
  '0xfbf5d148bf0f966f2e91c60cd7b9c8160ed6b166affa4c8a659cd24b017d583f';
const CLUSTER_ID =
  '0x0000000000000000000000000000000000000000000000000000000000000001';
const TRANSACTION_NONCE =
  '0x22b04dd885afb3c0a9d86ceab75d79be76cde1797b19380a63a31fa691d50972';
const CLUSTER_TOTAL_BALANCE = 100;
const CLUSTER_FREE_BALANCE = 1;

const WORKER_DEFINITION = new WorkerDefinition(
  {
    type: ServiceDefinitionType.SQS,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  },
  WorkerName.PHALA_LOG_WORKER,
  {
    parameters: { FunctionName: 'test', chainId: CHAIN },
  },
);

describe('Log worker tests', () => {
  let stage: Stage;
  let clusterWallet: ClusterWallet;
  let transaction: Transaction;
  let contractAbi: ContractAbi;
  let contract: Contract;
  let getPhalaLogsMock: jest.SpyInstance;
  let getClusterWalletBalanceMock: jest.SpyInstance;

  beforeAll(async () => {
    stage = await setupTest();

    contractAbi = await new ContractAbi(
      {
        contractType: ComputingContractType.SCHRODINGER,
        version: 1,
        abi: {},
      },
      stage.context,
    ).insert();
    contract = await new Contract(
      {
        contract_uuid: 'contract_uuid',
        project_uuid: 'project_uuid',
        name: 'name',
        contractType: ComputingContractType.SCHRODINGER,
        contractAddress: 'contractAddress',
        contractAbi_id: contractAbi.id,
        data: {
          clusterId: CLUSTER_ID,
          ipfsGatewayUrl: 'https://ipfs-eu1.apillon.io/ipfs/',
          nftChainRpcUrl: 'https://rpc.api.moonbeam.network/',
          restrictToOwner: true,
          nftContractAddress: '0x51e044373c4ba5a3d6eef0f7f7502b3d2f60276f',
        },
      },
      stage.context,
    ).insert();

    clusterWallet = await new ClusterWallet(
      {
        clusterId: CLUSTER_ID,
        walletAddress: WALLET_ADDRESS,
        minBalance: 200000000000,
        freeBalance: 0,
        currentBalance: 0,
        decimals: 12,
        token: 'PHA',
      },
      stage.context,
    ).insert();
    mockAxios
      .onGet(/https:\/\/api.coingecko.com\/api\/v3\/simple\/price.*/)
      .reply(200, {
        pha: { usd: 1 },
      });
    getPhalaLogsMock = jest.spyOn(
      BlockchainMicroservice.prototype,
      'getPhalaLogRecordsAndGasPrice',
    );
    getClusterWalletBalanceMock = jest.spyOn(
      BlockchainMicroservice.prototype,
      'getPhalaClusterWalletBalance',
    );
  });

  beforeEach(async () => {
    mockAxios.resetHistory();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Contract deploy transactions', () => {
    test('phala log worker should update successful contract deploy transactions and balance', async () => {
      mockGetPhalaLogsForDeploy(getPhalaLogsMock);
      mockGetClusterWalletBalance(getClusterWalletBalanceMock);
      const transactionHash = 'contractTransactionHash1';
      transaction = await new Transaction(
        {
          contract_id: contract.id,
          transactionType: TransactionType.DEPLOY_CONTRACT,
          transactionHash,
          transactionStatus: ComputingTransactionStatus.CONFIRMED,
        },
        stage.context,
      ).insert();

      const logWorker = new PhalaLogWorker(
        WORKER_DEFINITION,
        stage.context,
        QueueWorkerType.PLANNER,
      );
      const plans = await logWorker.runPlanner();
      await logWorker.runExecutor(plans[0]);

      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe(
        'https://api.coingecko.com/api/v3/simple/price?ids=pha&vs_currencies=USD',
      );
      expect(getPhalaLogsMock).toBeCalledTimes(1);
      expect(getPhalaLogsMock).toBeCalledWith(
        new PhalaLogFilterDto({
          clusterId: CLUSTER_ID,
          contract: 'contractAddress',
          nonce: null,
          type: 'Log',
        }),
      );
      expect(getClusterWalletBalanceMock).toBeCalledTimes(1);
      expect(getClusterWalletBalanceMock).toBeCalledWith(
        new PhalaClusterWalletDto({
          clusterId: CLUSTER_ID,
          walletAddress: WALLET_ADDRESS,
        }),
      );
      const updatedTransaction = await getTransaction(stage, transaction.id);
      expect(updatedTransaction.transactionStatus).toEqual(
        ComputingTransactionStatus.WORKER_SUCCESS,
      );
      const transactionLog = await getClusterTransactionLog(
        stage,
        transaction.id,
      );
      expect(transactionLog.project_uuid).toEqual('project_uuid');
      expect(transactionLog.status).toEqual(
        ComputingTransactionStatus.WORKER_SUCCESS,
      );
      expect(transactionLog.action).toEqual(TxAction.TRANSACTION);
      expect(transactionLog.blockId).toEqual(2176820);
      expect(transactionLog.direction).toEqual(TxDirection.COST);
      expect(transactionLog.hash).toEqual(transactionHash);
      expect(transactionLog.transaction_id).toEqual(transaction.id);
      const updatedClusterWallet = await getClusterWallet(
        stage,
        clusterWallet.id,
      );
      expect(updatedClusterWallet.currentBalance).toEqual(
        `${CLUSTER_FREE_BALANCE}`,
      );
      expect(updatedClusterWallet.totalBalance).toEqual(
        `${CLUSTER_TOTAL_BALANCE}`,
      );
    });
    test('phala log worker should update failed contract deploy transactions and balance', async () => {
      mockGetPhalaLogsForDeploy(getPhalaLogsMock, 'uninstantiated');
      mockGetClusterWalletBalance(getClusterWalletBalanceMock);
      const transactionHash = 'contractTransactionHash2';
      transaction = await new Transaction(
        {
          contract_id: contract.id,
          transactionType: TransactionType.DEPLOY_CONTRACT,
          transactionHash,
          transactionStatus: ComputingTransactionStatus.CONFIRMED,
        },
        stage.context,
      ).insert();

      const logWorker = new PhalaLogWorker(
        WORKER_DEFINITION,
        stage.context,
        QueueWorkerType.PLANNER,
      );
      const plans = await logWorker.runPlanner();
      await logWorker.runExecutor(plans[0]);

      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe(
        'https://api.coingecko.com/api/v3/simple/price?ids=pha&vs_currencies=USD',
      );
      expect(getPhalaLogsMock).toBeCalledTimes(1);
      expect(getPhalaLogsMock).toBeCalledWith(
        new PhalaLogFilterDto({
          clusterId: CLUSTER_ID,
          contract: 'contractAddress',
          nonce: null,
          type: 'Log',
        }),
      );
      expect(getClusterWalletBalanceMock).toBeCalledTimes(1);
      expect(getClusterWalletBalanceMock).toBeCalledWith(
        new PhalaClusterWalletDto({
          clusterId: CLUSTER_ID,
          walletAddress: WALLET_ADDRESS,
        }),
      );
      const updatedTransaction = await getTransaction(stage, transaction.id);
      expect(updatedTransaction.transactionStatus).toEqual(
        ComputingTransactionStatus.WORKER_FAILED,
      );
      const transactionLog = await getClusterTransactionLog(
        stage,
        transaction.id,
      );
      expect(transactionLog.project_uuid).toEqual('project_uuid');
      expect(transactionLog.status).toEqual(
        ComputingTransactionStatus.WORKER_FAILED,
      );
      expect(transactionLog.action).toEqual(TxAction.TRANSACTION);
      expect(transactionLog.blockId).toEqual(2176820);
      expect(transactionLog.direction).toEqual(TxDirection.COST);
      expect(transactionLog.hash).toEqual(transactionHash);
      expect(transactionLog.transaction_id).toEqual(transaction.id);
      const updatedClusterWallet = await getClusterWallet(
        stage,
        clusterWallet.id,
      );
      expect(updatedClusterWallet.currentBalance).toEqual(
        `${CLUSTER_FREE_BALANCE}`,
      );
      expect(updatedClusterWallet.totalBalance).toEqual(
        `${CLUSTER_TOTAL_BALANCE}`,
      );
    });
  });
  describe('Contract call transactions', () => {
    test('phala log worker should update successful transactions and balance', async () => {
      mockGetPhalaLogs(getPhalaLogsMock);
      mockGetClusterWalletBalance(getClusterWalletBalanceMock);
      const transactionHash = 'transactionHash1';
      transaction = await new Transaction(
        {
          contract_id: contract.id,
          transactionType: TransactionType.ASSIGN_CID_TO_NFT,
          transactionHash,
          transactionStatus: ComputingTransactionStatus.CONFIRMED,
          nonce: 'nonce',
        },
        stage.context,
      ).insert();

      const logWorker = new PhalaLogWorker(
        WORKER_DEFINITION,
        stage.context,
        QueueWorkerType.PLANNER,
      );
      const plans = await logWorker.runPlanner();
      await logWorker.runExecutor(plans[0]);

      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe(
        'https://api.coingecko.com/api/v3/simple/price?ids=pha&vs_currencies=USD',
      );
      expect(getPhalaLogsMock).toBeCalledTimes(1);
      expect(getPhalaLogsMock).toBeCalledWith(
        new PhalaLogFilterDto({
          clusterId: CLUSTER_ID,
          contract: null,
          nonce: 'nonce',
          type: 'MessageOutput',
        }),
      );
      expect(getClusterWalletBalanceMock).toBeCalledTimes(1);
      expect(getClusterWalletBalanceMock).toBeCalledWith(
        new PhalaClusterWalletDto({
          clusterId: CLUSTER_ID,
          walletAddress: WALLET_ADDRESS,
        }),
      );
      const updatedTransaction = await getTransaction(stage, transaction.id);
      expect(updatedTransaction.transactionStatus).toEqual(
        ComputingTransactionStatus.WORKER_SUCCESS,
      );
      const transactionLog = await getClusterTransactionLog(
        stage,
        transaction.id,
      );
      expect(transactionLog.project_uuid).toEqual('project_uuid');
      expect(transactionLog.status).toEqual(
        ComputingTransactionStatus.WORKER_SUCCESS,
      );
      expect(transactionLog.action).toEqual(TxAction.TRANSACTION);
      expect(transactionLog.blockId).toEqual(2146342);
      expect(transactionLog.direction).toEqual(TxDirection.COST);
      expect(transactionLog.hash).toEqual(transactionHash);
      expect(transactionLog.transaction_id).toEqual(transaction.id);
      const updatedClusterWallet = await getClusterWallet(
        stage,
        clusterWallet.id,
      );
      expect(updatedClusterWallet.currentBalance).toEqual(
        `${CLUSTER_FREE_BALANCE}`,
      );
      expect(updatedClusterWallet.totalBalance).toEqual(
        `${CLUSTER_TOTAL_BALANCE}`,
      );
    });

    test('Phala log worker should update failed transactions and balance', async () => {
      mockGetPhalaLogs(getPhalaLogsMock, ['failed']);
      mockGetClusterWalletBalance(getClusterWalletBalanceMock);
      const transactionHash = 'transactionHash2';
      transaction = await new Transaction(
        {
          contract_id: contract.id,
          transactionType: TransactionType.ASSIGN_CID_TO_NFT,
          transactionHash,
          transactionStatus: ComputingTransactionStatus.CONFIRMED,
          nonce: 'nonce',
        },
        stage.context,
      ).insert();

      const logWorker = new PhalaLogWorker(
        WORKER_DEFINITION,
        stage.context,
        QueueWorkerType.PLANNER,
      );
      const plans = await logWorker.runPlanner();
      await logWorker.runExecutor(plans[0]);

      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe(
        'https://api.coingecko.com/api/v3/simple/price?ids=pha&vs_currencies=USD',
      );
      expect(getPhalaLogsMock).toBeCalledTimes(1);
      expect(getPhalaLogsMock).toBeCalledWith(
        new PhalaLogFilterDto({
          clusterId: CLUSTER_ID,
          contract: null,
          nonce: 'nonce',
          type: 'MessageOutput',
        }),
      );
      expect(getClusterWalletBalanceMock).toBeCalledTimes(1);
      expect(getClusterWalletBalanceMock).toBeCalledWith(
        new PhalaClusterWalletDto({
          clusterId: CLUSTER_ID,
          walletAddress: WALLET_ADDRESS,
        }),
      );
      const updatedTransaction = await getTransaction(stage, transaction.id);
      expect(updatedTransaction.transactionStatus).toEqual(
        ComputingTransactionStatus.WORKER_FAILED,
      );
      const transactionLog = await getClusterTransactionLog(
        stage,
        transaction.id,
      );
      expect(transactionLog.project_uuid).toEqual('project_uuid');
      expect(transactionLog.status).toEqual(
        ComputingTransactionStatus.WORKER_FAILED,
      );
      expect(transactionLog.action).toEqual(TxAction.TRANSACTION);
      expect(transactionLog.blockId).toEqual(2146342);
      expect(transactionLog.direction).toEqual(TxDirection.COST);
      expect(transactionLog.hash).toEqual(transactionHash);
      expect(transactionLog.transaction_id).toEqual(transaction.id);
      const updatedClusterWallet = await getClusterWallet(
        stage,
        clusterWallet.id,
      );
      expect(updatedClusterWallet.currentBalance).toEqual(
        `${CLUSTER_FREE_BALANCE}`,
      );
      expect(updatedClusterWallet.totalBalance).toEqual(
        `${CLUSTER_TOTAL_BALANCE}`,
      );
    });
  });
});

// HELPERS
function mockGetPhalaLogsForDeploy(
  getPhalaLogsMock: jest.SpyInstance,
  message = 'instantiated',
) {
  return getPhalaLogsMock.mockImplementation(
    async (_phalaLogFilter: PhalaLogFilterDto) => {
      return {
        gasPrice: 1,
        records: [
          {
            sequence: 500480,
            type: 'Log',
            blockNumber: 2176820,
            contract: CONTRACT_ADDRESS,
            entry: CONTRACT_ADDRESS,
            execMode: 'transaction',
            timestamp: 1702475952310,
            level: 3,
            message,
          },
        ],
      };
    },
  );
}

// HELPERS
function mockGetPhalaLogs(
  getPhalaLogsMock: jest.SpyInstance,
  flags: string[] = [],
) {
  return getPhalaLogsMock.mockImplementation(
    async (_phalaLogFilter: PhalaLogFilterDto) => {
      return {
        gasPrice: 1,
        records: [
          {
            sequence: 453401,
            type: 'MessageOutput',
            blockNumber: 2146342,
            origin:
              '0xf45015871a0784d7cfc25c51b36bfa2d4f964b3aca8b125fc2520bbd4a75a665',
            contract: CONTRACT_ADDRESS,
            nonce: TRANSACTION_NONCE,
            output: {
              gasConsumed: { refTime: 7489062865, proofSize: 170952 },
              gasRequired: { refTime: 8064084450, proofSize: 1219266 },
              storageDeposit: { charge: 0 },
              debugMessage: '',
              result: { ok: { flags, data: '0x000010446f6e65' } },
            },
          },
        ],
      };
    },
  );
}

function mockGetClusterWalletBalance(
  getClusterWalletBalance: jest.SpyInstance,
) {
  return getClusterWalletBalance.mockImplementation(async () => {
    return { total: CLUSTER_TOTAL_BALANCE, free: CLUSTER_FREE_BALANCE };
  });
}

async function getClusterWallet(stage: Stage, clusterWalletId: number) {
  const data = (
    await stage.context.mysql.paramExecute(
      `SELECT * FROM ${DbTables.CLUSTER_WALLET} WHERE id=${clusterWalletId}`,
    )
  )[0];

  return new ClusterWallet(data, stage.context);
}

async function getClusterTransactionLog(stage: Stage, transactionId: number) {
  const data = (
    await stage.context.mysql.paramExecute(
      `SELECT * FROM ${DbTables.CLUSTER_TRANSACTION_LOG} WHERE transaction_id=${transactionId}`,
    )
  )[0];

  return new ClusterTransactionLog(data, stage.context);
}

async function getTransaction(stage: Stage, transactionId: number) {
  const data = (
    await stage.context.mysql.paramExecute(
      `SELECT * FROM ${DbTables.TRANSACTION} WHERE id=${transactionId}`,
    )
  )[0];
  return new Transaction(data, stage.context);
}
