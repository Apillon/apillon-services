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
        console.info('processing webhook transaction: ', res);
        const transaction = await new TransactionRepository(
          ctx,
        ).populateByTransactionHash(res.transactionHash);
        if (!transaction.exists()) {
          await this.writeEventLog({
            logType: LogType.WARN,
            message: `Transaction with hash ${res.transactionHash} not found.`,
            service: ServiceName.CONTRACTS,
            data: {
              transactionHash: res.transactionHash,
            },
          });
          return;
        }
        transaction.transactionStatus = res.transactionStatus;
        await transaction.update();

        const contractDeploy = await new ContractDeploy(
          {},
          this.context,
        ).populateByUUID(transaction.refId);
        if (!contractDeploy.exists()) {
          await this.writeEventLog({
            logType: LogType.WARN,
            message: `Deployed contract with uuid ${transaction.refId} not found.`,
            service: ServiceName.CONTRACTS,
            data: {
              contract_uuid: transaction.refId,
            },
          });
        }
        switch (transaction.transactionStatus) {
          case TransactionStatus.CONFIRMED: {
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
              default:
                return;
            }
            break;
          }
          case TransactionStatus.FAILED:
          case TransactionStatus.ERROR: {
            //Refund credit if transaction failed
            contractDeploy.contractStatus = ContractStatus.FAILED;
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
            break;
          }
          default:
            return;
        }

        await contractDeploy.update();
        await this.writeEventLog({
          logType: LogType.INFO,
          project_uuid: contractDeploy?.project_uuid,
          message: `Status updated for deployed contract with UUID  ${contractDeploy.contract_uuid}.`,
          service: ServiceName.CONTRACTS,
          data: {
            contract_uuid: contractDeploy.contract_uuid,
            contractStatus: contractDeploy.contractStatus,
            updateTime: contractDeploy.updateTime,
          },
        });
      },
    );
  }
}
