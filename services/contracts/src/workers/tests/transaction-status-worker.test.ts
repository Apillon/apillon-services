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
import { v4 as uuidV4 } from 'uuid';
import { Transaction } from '../../modules/contracts/models/transaction.model';
import { releaseStage, setupTest, Stage } from '../../test/setup';

const mockAxios = new MockAdapter(axios);

const CHAIN = EvmChain.MOONBASE;
const WALLET_ADDRESS = '0x7DdEfb047752a969a0fC2A76665f99E1656bc195';

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
    mockRefundCredit = jest.spyOn(Scs.prototype, 'refundCredit');
  });

  beforeEach(async () => {
    mockAxios.resetHistory();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('test CONFIRMED transaction statuses', () => {
    const transactionStatus = TransactionStatus.CONFIRMED;
    test('confirmed contract deploy transaction', async () => {
      const transactionType = TransactionType.DEPLOY_CONTRACT;
      const contract = await new ContractDeploy(
        {
          contract_uuid: uuidV4(),
          project_uuid: 'project_uuid',
          name: 'name',
          contractAddress: '0xc4fd600f3b60abb5ca2248399db3d88ca3cd8a77',
          chainType: ChainType.EVM,
          chain: CHAIN,
          contractStatus: ContractStatus.DEPLOYING,
        },
        stage.context,
      ).insert();
      transaction = await new Transaction({}, stage.context)
        .populate({
          transaction_uuid: 'confirmed_contract_deploy_tx_uuid',
          transactionType,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'confirmed_contract_deploy_tx_hash',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();

      await worker.runExecutor({
        data: [
          new TransactionWebhookDataDto({}, stage.context).populate({
            id: 1,
            transactionHash: transaction.transactionHash,
            referenceTable: transaction.refTable,
            referenceId: transaction.refId,
            transactionStatus,
            data: '',
          }),
        ],
      });

      expect(mockRefundCredit).toBeCalledTimes(0);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.status).toEqual(SqlModelStatus.ACTIVE);
      expect(readContract.contractStatus).toEqual(ContractStatus.DEPLOYED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(transactionStatus);
    });

    test('confirmed call ownership transaction', async () => {
      const transactionType = TransactionType.CALL_CONTRACT;
      const contract = await new ContractDeploy(
        {
          contract_uuid: uuidV4(),
          project_uuid: 'project_uuid',
          name: 'name',
          contractAddress: '0xc4fd600f3b60abb5ca2248399db3d88ca3cd8a77',
          chainType: ChainType.EVM,
          chain: CHAIN,
          contractStatus: ContractStatus.DEPLOYED,
        },
        stage.context,
      ).insert();
      transaction = await new Transaction({}, stage.context)
        .populate({
          transaction_uuid: 'confirmed_contract_call_tx_uuid',
          transactionType,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'confirmed_contract_call_tx_hash',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();
      await worker.runExecutor({
        data: [
          new TransactionWebhookDataDto({}, stage.context).populate({
            id: 1,
            transactionHash: transaction.transactionHash,
            referenceTable: transaction.refTable,
            referenceId: transaction.refId,
            transactionStatus,
            data: '',
          }),
        ],
      });

      expect(mockRefundCredit).toBeCalledTimes(0);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.status).toEqual(SqlModelStatus.ACTIVE);
      expect(readContract.contractStatus).toEqual(ContractStatus.DEPLOYED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(transactionStatus);
    });

    test('confirmed transfer ownership transaction', async () => {
      const transactionType = TransactionType.TRANSFER_CONTRACT_OWNERSHIP;
      const contract = await new ContractDeploy(
        {
          contract_uuid: uuidV4(),
          project_uuid: 'project_uuid',
          name: 'name',
          contractAddress: '0xc4fd600f3b60abb5ca2248399db3d88ca3cd8a77',
          chainType: ChainType.EVM,
          chain: CHAIN,
          contractStatus: ContractStatus.DEPLOYED,
        },
        stage.context,
      ).insert();
      transaction = await new Transaction({}, stage.context)
        .populate({
          transaction_uuid: 'confirmed_contract_transfer_tx_uuid',
          transactionType,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'contractTransactionHash1',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();
      await worker.runExecutor({
        data: [
          new TransactionWebhookDataDto({}, stage.context).populate({
            id: 1,
            transactionHash: transaction.transactionHash,
            referenceTable: transaction.refTable,
            referenceId: transaction.refId,
            transactionStatus,
            data: '',
          }),
        ],
      });

      expect(mockRefundCredit).toBeCalledTimes(0);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.status).toEqual(SqlModelStatus.ACTIVE);
      expect(readContract.contractStatus).toEqual(ContractStatus.TRANSFERRED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(transactionStatus);
    });
  });

  describe('test FAILED transaction statuses', () => {
    const transactionStatus = TransactionStatus.FAILED;
    test('failed contract deploy transaction', async () => {
      const contract = await new ContractDeploy(
        {
          contract_uuid: uuidV4(),
          project_uuid: 'project_uuid',
          name: 'name',
          contractAddress: '0xc4fd600f3b60abb5ca2248399db3d88ca3cd8a77',
          chainType: ChainType.EVM,
          chain: CHAIN,
          contractStatus: ContractStatus.DEPLOYING,
        },
        stage.context,
      ).insert();
      const transactionType = TransactionType.DEPLOY_CONTRACT;
      transaction = await new Transaction({}, stage.context)
        .populate({
          transaction_uuid: 'failed_contract_deploy_tx_uuid',
          transactionType,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'failed_contract_deploy_tx_hash',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();

      await worker.runExecutor({
        data: [
          new TransactionWebhookDataDto({}, stage.context).populate({
            id: 1,
            transactionHash: transaction.transactionHash,
            referenceTable: transaction.refTable,
            referenceId: transaction.refId,
            transactionStatus,
            data: '',
          }),
        ],
      });

      expect(mockRefundCredit).toBeCalledTimes(1);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.contractStatus).toEqual(ContractStatus.FAILED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(transactionStatus);
    });

    test('failed contract call transaction', async () => {
      const contract = await new ContractDeploy(
        {
          contract_uuid: uuidV4(),
          project_uuid: 'project_uuid',
          name: 'name',
          contractAddress: '0xc4fd600f3b60abb5ca2248399db3d88ca3cd8a77',
          chainType: ChainType.EVM,
          chain: CHAIN,
          contractStatus: ContractStatus.DEPLOYED,
        },
        stage.context,
      ).insert();
      const transactionType = TransactionType.CALL_CONTRACT;
      transaction = await new Transaction({}, stage.context)
        .populate({
          transaction_uuid: 'failed_contract_call_tx_uuid',
          transactionType,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'failed_contract_call_tx_hash',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();

      await worker.runExecutor({
        data: [
          new TransactionWebhookDataDto({}, stage.context).populate({
            id: 1,
            transactionHash: transaction.transactionHash,
            referenceTable: transaction.refTable,
            referenceId: transaction.refId,
            transactionStatus,
            data: '',
          }),
        ],
      });

      expect(mockRefundCredit).toBeCalledTimes(1);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.contractStatus).toEqual(ContractStatus.DEPLOYED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(transactionStatus);
    });

    test('failed contract transfer transaction', async () => {
      const contract = await new ContractDeploy(
        {
          contract_uuid: uuidV4(),
          project_uuid: 'project_uuid',
          name: 'name',
          contractAddress: '0xc4fd600f3b60abb5ca2248399db3d88ca3cd8a77',
          chainType: ChainType.EVM,
          chain: CHAIN,
          contractStatus: ContractStatus.DEPLOYED,
        },
        stage.context,
      ).insert();
      const transactionType = TransactionType.TRANSFER_CONTRACT_OWNERSHIP;
      transaction = await new Transaction({}, stage.context)
        .populate({
          transaction_uuid: 'failed_contract_transfer_tx_uuid',
          transactionType,
          transactionStatus: TransactionStatus.PENDING,
          transactionHash: 'failed_contract_transfer_tx_hash',
          refTable: DbTables.CONTRACT_DEPLOY,
          refId: contract.contract_uuid,
          walletAddress: WALLET_ADDRESS,
          chain: CHAIN,
        })
        .insert();

      await worker.runExecutor({
        data: [
          new TransactionWebhookDataDto({}, stage.context).populate({
            id: 1,
            transactionHash: transaction.transactionHash,
            referenceTable: transaction.refTable,
            referenceId: transaction.refId,
            transactionStatus,
            data: '',
          }),
        ],
      });

      expect(mockRefundCredit).toBeCalledTimes(1);
      const readContract = await getContract(stage, contract.id);
      expect(readContract.contractStatus).toEqual(ContractStatus.DEPLOYED);
      const readTransaction = await getTransaction(stage, transaction.id);
      expect(readTransaction.transactionStatus).toBe(transactionStatus);
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
