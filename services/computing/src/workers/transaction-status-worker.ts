import {
  Context,
  env,
  LogType,
  runWithWorkers,
  ServiceName,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  ComputingTransactionStatus,
  ContractStatus,
  TransactionType,
} from '../config/types';
import { Transaction } from '../modules/transaction/models/transaction.model';
import { Contract } from '../modules/computing/models/contract.model';

function mapTransactionStatus(transactionStatus: TransactionStatus) {
  switch (transactionStatus) {
    case TransactionStatus.PENDING:
      return ComputingTransactionStatus.PENDING;
    case TransactionStatus.CONFIRMED:
      return ComputingTransactionStatus.CONFIRMED;
    case TransactionStatus.FAILED:
      return ComputingTransactionStatus.FAILED;
    case TransactionStatus.ERROR:
      return ComputingTransactionStatus.ERROR;
    default:
      throw new Error(
        `Cant map TransactionStatus ${transactionStatus} to ComputingTransactionStatus.`,
      );
  }
}

export class TransactionStatusWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: {
    data: TransactionWebhookDataDto[];
  }): Promise<any> {
    console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);
    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (res: TransactionWebhookDataDto, ctx) => {
        // update transaction status in computing
        const transaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(res.transactionHash);
        if (!transaction.exists()) {
          await this.writeEventLog({
            logType: LogType.ERROR,
            message: `Computing transaction with hash ${res.transactionHash} not found.`,
            service: ServiceName.COMPUTING,
            data: res,
          });
          return;
        }

        await this.writeEventLog({
          logType: LogType.INFO,
          message: `Updating computing transaction with hash ${res.transactionHash}.`,
          service: ServiceName.COMPUTING,
          data: res,
        });
        transaction.transactionStatus = mapTransactionStatus(
          res.transactionStatus,
        );
        await transaction.update();

        // update contract if transaction was made on contract
        if (
          transaction.contract_id &&
          transaction.transactionStatus === ComputingTransactionStatus.CONFIRMED
        ) {
          const contract = await new Contract({}, this.context).populateById(
            transaction.contract_id,
          );
          if (!contract.exists()) {
            await this.writeEventLog({
              logType: LogType.ERROR,
              message: `Computing contract with id ${transaction.contract_id} not found.`,
              service: ServiceName.COMPUTING,
              data: {
                transaction_id: transaction.id,
                contract_id: transaction.contract_id,
              },
            });
            return;
          }
          let updated = false;
          switch (transaction.transactionType) {
            case TransactionType.DEPLOY_CONTRACT:
              contract.contractStatus = ContractStatus.DEPLOYING;
              contract.contractAddress = res.data;
              contract.transactionHash = transaction.transactionHash;
              updated = true;
              break;
            case TransactionType.TRANSFER_CONTRACT_OWNERSHIP:
              contract.contractStatus = ContractStatus.TRANSFERRING;
              updated = true;
              break;
          }
          if (updated) {
            await contract.update();
            await this.writeEventLog({
              logType: LogType.INFO,
              project_uuid: contract?.project_uuid,
              message: `Contract ${contract.contractAddress} status updated to ${contract.contractStatus}.`,
              service: ServiceName.COMPUTING,
              data: {
                collection_uuid: contract.contract_uuid,
                contractStatus: contract.contractStatus,
                updateTime: contract.updateTime,
              },
            });
          }
        }
      },
    );
  }
}
