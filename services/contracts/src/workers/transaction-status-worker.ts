import {
  Context,
  env,
  LogType,
  refundCredit,
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
import { TransactionType } from '../config/types';
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
        if (!transaction.refId) {
          await this.writeEventLog({
            logType: LogType.WARN,
            message: `Deployed contract uuid not found on transaction with uuid${transaction.transaction_uuid}.`,
            service: ServiceName.CONTRACTS,
            data: {
              transaction_uuid: transaction.transaction_uuid,
            },
          });
          return;
        }
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
          return;
        }
        switch (transaction.transactionStatus) {
          case TransactionStatus.CONFIRMED: {
            switch (transaction.transactionType) {
              case TransactionType.DEPLOY_CONTRACT: {
                // if (data && contractDeploy.chainType === ChainType.SUBSTRATE) {
                //   contract.contractAddress = data;
                // }
                contractDeploy.markAsDeployed();
                await contractDeploy.update();
                break;
              }
              case TransactionType.TRANSFER_CONTRACT_OWNERSHIP: {
                contractDeploy.markAsTransferred();
                await contractDeploy.update();
                break;
              }
              default:
                return;
            }
            break;
          }
          case TransactionStatus.FAILED:
          case TransactionStatus.ERROR: {
            switch (transaction.transactionType) {
              case TransactionType.DEPLOY_CONTRACT: {
                contractDeploy.markAsFailedDeploying();
                await contractDeploy.update();
                break;
              }
              case TransactionType.TRANSFER_CONTRACT_OWNERSHIP: {
                contractDeploy.markAsNotTransferred();
                await contractDeploy.update();
                break;
              }
            }
            await refundCredit(
              this.context,
              transaction.refTable,
              transaction.transaction_uuid,
              'TransactionStatusWorker.runExecutor',
              ServiceName.CONTRACTS,
            );
            break;
          }
          default:
            return;
        }

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
