import {
  ChainType,
  EvmChain,
  Scs,
  SqlModelStatus,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../worker-executor';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { ContractStatus, DbTables, TransactionType } from '../../config/types';
import { TransactionStatusWorker } from '../transaction-status-worker';
import { ContractDeploy } from '../../modules/contracts/models/contractDeploy.model';

import { Transaction } from '../../modules/contracts/models/transaction.model';
import { releaseStage, setupTest, Stage } from '../../test/setup';

const mockAxios = new MockAdapter(axios);

const CHAIN = EvmChain.MOONBASE;
const WALLET_ADDRESS = '0x7DdEfb047752a969a0fC2A76665f99E1656bc195';
const CONTRACT_ADDRESS = '0xc4fd600f3b60abb5ca2248399db3d88ca3cd8a77';

const WORKER_DEFINITION = new WorkerDefinition(
  {
    type: ServiceDefinitionType.SQS,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  },
  WorkerName.TRANSACTION_STATUS,
  {
    parameters: { FunctionName: 'test', chainId: CHAIN },
  },
);

describe('Log worker tests', () => {
  let stage: Stage;
  let contract: ContractDeploy;
  let transaction: Transaction;
  let mockRefundCredit: jest.SpyInstance;
  let worker: TransactionStatusWorker;

  beforeAll(async () => {
    stage = await setupTest();
    worker = new TransactionStatusWorker(
      WORKER_DEFINITION,
      stage.context,
      QueueWorkerType.PLANNER,
    );
    contract = await new ContractDeploy(
      {
        contract_uuid: 'contract_uuid',
        project_uuid: 'project_uuid',
        name: 'name',
        contractAddress: CONTRACT_ADDRESS,
        chainType: ChainType.EVM,
        chain: CHAIN,
      },
      stage.context,
    ).insert();
    mockRefundCredit = jest.spyOn(Scs.prototype, 'refundCredit');
  });

  beforeEach(async () => {
    mockAxios.resetHistory();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('test transaction statuses', () => {
    test('confirmed contract deploy transaction', async () => {
      const eventTransactionStatus = TransactionStatus.CONFIRMED;
      transaction = await new Transaction({}, stage.context)
        .populate({
          transactionType: TransactionType.DEPLOY_CONTRACT,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'contractTransactionHash0',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();
      const event = new TransactionWebhookDataDto({}, stage.context).populate({
        id: 1,
        transactionHash: transaction.transactionHash,
        referenceTable: transaction.refTable,
        referenceId: transaction.refId,
        transactionStatus: eventTransactionStatus,
        data: '',
      });
      await worker.runExecutor({
        data: [event],
      });

      expect(mockRefundCredit).toBeCalledTimes(0);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.status).toEqual(SqlModelStatus.ACTIVE);
      expect(readContract.contractStatus).toEqual(ContractStatus.DEPLOYED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(eventTransactionStatus);
    });

    test('confirmed transfer ownership transaction', async () => {
      const eventTransactionStatus = ContractStatus.TRANSFERRED;
      transaction = await new Transaction({}, stage.context)
        .populate({
          transactionType: TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'contractTransactionHash1',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();
      const event = new TransactionWebhookDataDto({}, stage.context).populate({
        id: 1,
        transactionHash: transaction.transactionHash,
        referenceTable: transaction.refTable,
        referenceId: transaction.refId,
        transactionStatus: eventTransactionStatus,
        data: '',
      });
      await worker.runExecutor({
        data: [event],
      });

      expect(mockRefundCredit).toBeCalledTimes(0);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.status).toEqual(SqlModelStatus.ACTIVE);
      expect(readContract.contractStatus).toEqual(ContractStatus.DEPLOYED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(eventTransactionStatus);
    });

    test('failed transaction', async () => {
      const eventTransactionStatus = TransactionStatus.ERROR;
      transaction = await new Transaction({}, stage.context)
        .populate({
          transactionType: TransactionType.DEPLOY_CONTRACT,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'contractTransactionHash2',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();
      const event = new TransactionWebhookDataDto({}, stage.context).populate({
        id: 1,
        transactionHash: transaction.transactionHash,
        referenceTable: transaction.refTable,
        referenceId: transaction.refId,
        transactionStatus: eventTransactionStatus,
        data: '',
      });
      await worker.runExecutor({
        data: [event],
      });

      expect(mockRefundCredit).toBeCalledTimes(1);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.contractStatus).toEqual(ContractStatus.FAILED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(eventTransactionStatus);
    });
  });
});

// HELPERS
async function getContract(stage: Stage, id: number) {
  return await new ContractDeploy({}, stage.context).populateById(id);
}

async function getTransaction(stage: Stage, id: number) {
  return await new Transaction({}, stage.context).populateById(id);
}
