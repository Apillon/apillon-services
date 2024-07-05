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
        const transaction = await new TransactionRepository(
          ctx,
        ).populateByTransactionHash(res.transactionHash);
        if (transaction.exists()) {
          transaction.transactionStatus = res.transactionStatus;
          await transaction.update();

          // perform custom logic, depend of transactionType
          const contractDeploy = await new ContractDeploy(
            {},
            this.context,
          ).populateById(transaction.refId);
          if (transaction.transactionStatus === TransactionStatus.CONFIRMED) {
            switch (transaction.transactionType) {
              case TransactionType.DEPLOY_CONTRACT: {
                contractDeploy.contractStatus = ContractStatus.DEPLOYED;
                // if (data && contractDeploy.chainType === ChainType.SUBSTRATE) {
                //   contract.contractAddress = data;
                // }
                contractDeploy.status = SqlModelStatus.ACTIVE;
                break;
              }
              case TransactionType.TRANSFER_CONTRACT_OWNERSHIP: {
                contractDeploy.contractStatus = ContractStatus.TRANSFERRED;
                break;
              }
            }
            await contractDeploy.update();
          } else if (
            [TransactionStatus.FAILED, TransactionStatus.ERROR].includes(
              res.transactionStatus,
            )
          ) {
            //Refund credit if transaction failed
            contractDeploy.contractStatus = ContractStatus.FAILED;
            await contractDeploy.update();
            //For ContractDeploy, reference for credit is contract. For other transaction_uuid se set as reference.
            const referenceTable =
              transaction.transactionType == TransactionType.DEPLOY_CONTRACT
                ? DbTables.CONTRACT
                : DbTables.TRANSACTION;
            const referenceId =
              transaction.transactionType == TransactionType.DEPLOY_CONTRACT
                ? transaction.refId // this is contract_uuid
                : transaction.transaction_uuid;

            await refundCredit(
              this.context,
              referenceTable,
              referenceId.toString(),
              'TransactionStatusWorker.runExecutor',
              ServiceName.CONTRACTS,
            );
          }

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
      },
    );
  }
}
