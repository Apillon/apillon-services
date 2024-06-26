import {
  Context,
  env,
  LogType,
  refundCredit,
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
import { ContractStatus, DbTables, TransactionType } from '../config/types';
import { ContractDeploy } from '../modules/contracts/models/contractDeploy.model';
import { Transaction } from '../modules/contracts/models/transaction.model';
import { TransactionRepository } from '../lib/repositores/transaction-repository';

export class TransactionStatusWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.CONTRACTS_AWS_WORKER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: {
    data: TransactionWebhookDataDto[];
  }): Promise<any> {
    // console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);

    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (res: TransactionWebhookDataDto, ctx) => {
        // console.info('processing webhook transaction: ', res);
        const contractTransaction = await new TransactionRepository(
          ctx,
        ).populateByTransactionHash(res.transactionHash);
        if (contractTransaction.exists()) {
          contractTransaction.transactionStatus = res.transactionStatus;
          await contractTransaction.update();

          // perform custom logic, depend of transactionType
          if (
            contractTransaction.transactionType ==
            TransactionType.DEPLOY_CONTRACT
          ) {
            //Update contract
            await this.updateContractStatus(contractTransaction, res.data);
          }

          //Refund credit if transaction failed
          if (res.transactionStatus > 2) {
            //For ContractDeploy, reference for credit is contract. For other transaction_uuid se set as reference.
            const referenceTable =
              contractTransaction.transactionType ==
              TransactionType.DEPLOY_CONTRACT
                ? DbTables.CONTRACT
                : DbTables.TRANSACTION;
            const referenceId =
              contractTransaction.transactionType ==
              TransactionType.DEPLOY_CONTRACT
                ? contractTransaction.refId // this is contract_uuid
                : contractTransaction.transaction_uuid;

            await refundCredit(
              this.context,
              referenceTable,
              referenceId.toString(),
              'TransactionStatusWorker.runExecutor',
              ServiceName.CONTRACTS,
            );
          }
        }
      },
    );
  }

  private async updateContractStatus(tx: Transaction, _data: string) {
    if (tx.transactionStatus === TransactionStatus.CONFIRMED) {
      const contractDeploy = await new ContractDeploy(
        {},
        this.context,
      ).populateById(tx.refId);

      if (tx.transactionType === TransactionType.DEPLOY_CONTRACT) {
        contractDeploy.contractStatus = ContractStatus.DEPLOYED;
        // if (data && contract.chainType === ChainType.SUBSTRATE) {
        //   contract.contractAddress = data;
        // }
      }
      contractDeploy.status = SqlModelStatus.ACTIVE;
      await contractDeploy.update();

      await this.writeEventLog({
        logType: LogType.INFO,
        project_uuid: contractDeploy?.project_uuid,
        message: `Contract ${contractDeploy.name} status updated`,
        service: ServiceName.CONTRACTS,
        data: {
          contract_uuid: contractDeploy.contract_uuid,
          contractStatus: contractDeploy.contractStatus,
          updateTime: contractDeploy.updateTime,
        },
      });
    }
  }
}
