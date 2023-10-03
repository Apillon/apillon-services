import {
  Context,
  env,
  LogType,
  runWithWorkers,
  ServiceName,
  SqlModelStatus,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ContractStatus, TransactionType } from '../config/types';
import { Contract } from '../modules/computing/models/contract.model';
import { Transaction } from '../modules/transaction/models/transaction.model';

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
        const computingTransaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(res.transactionHash);
        if (computingTransaction.exists()) {
          computingTransaction.transactionStatus = res.transactionStatus;
          await computingTransaction.update();
          if (
            computingTransaction.transactionType ==
              TransactionType.DEPLOY_CONTRACT ||
            computingTransaction.transactionType ==
              TransactionType.TRANSFER_CONTRACT_OWNERSHIP
          ) {
            await this.updateContractStatus(computingTransaction);
          }
        }
      },
    );
  }

  private async updateContractStatus(tx: Transaction) {
    if (tx.transactionStatus === TransactionStatus.CONFIRMED) {
      const contract: Contract = await new Contract(
        {},
        this.context,
      ).populateById(tx.refId);

      if (tx.transactionType === TransactionType.DEPLOY_CONTRACT) {
        contract.contractStatus = ContractStatus.DEPLOYED;
      } else if (
        tx.transactionType === TransactionType.TRANSFER_CONTRACT_OWNERSHIP
      ) {
        contract.contractStatus = ContractStatus.TRANSFERRED;
      }
      contract.status = SqlModelStatus.ACTIVE;
      await contract.update();

      await this.writeEventLog({
        logType: LogType.INFO,
        project_uuid: contract?.project_uuid,
        message: `Contract ${contract.name} status updated`,
        service: ServiceName.COMPUTING,
        data: {
          collection_uuid: contract.contract_uuid,
          contractStatus: contract.contractStatus,
          updateTime: contract.updateTime,
        },
      });
    }
  }
}
