import { Context, env, LogType, ServiceName } from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ComputingErrorCode, ContractStatus } from '../config/types';
import { ComputingCodeException } from '../lib/exceptions';
import { deployPhalaContract } from '../lib/utils/contract-utils';
import { Contract } from '../modules/computing/models/contract.model';

export class DeployContractWorker extends BaseQueueWorker {
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

  public async runExecutor(data: any): Promise<any> {
    // console.info('RUN EXECUTOR (DeployContractWorker). data: ', data);
    //Prepare data and execute validations
    if (!data?.collection_uuid || !data?.baseUri) {
      throw new ComputingCodeException({
        code: ComputingErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    const contract = await new Contract({}, this.context).populateByUUID(
      data.collection_uuid,
    );

    if (!contract.exists()) {
      throw new ComputingCodeException({
        status: 404,
        code: ComputingErrorCode.COLLECTION_NOT_FOUND,
        context: this.context,
      });
    }
    if (
      contract.contractStatus == ContractStatus.DEPLOYING ||
      contract.contractStatus == ContractStatus.DEPLOYED
    ) {
      throw new ComputingCodeException({
        status: 400,
        code: ComputingErrorCode.CONTRACT_ALREADY_DEPLOYED,
        context: this.context,
      });
    }

    contract.contractStatus = ContractStatus.DEPLOYING;
    await contract.update();

    try {
      const conn = await this.context.mysql.start();
      try {
        await deployPhalaContract(this.context, contract, conn);
        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.context.mysql.rollback(conn);

        throw await new ComputingCodeException({
          status: 500,
          code: ComputingErrorCode.DEPLOY_CONTRACT_ERROR,
          context: this.context,
          sourceFunction: 'DeployContractWorker.runExecutor()',
          errorMessage: 'Error deploying Nft contract',
          details: err,
        }).writeToMonitor({ project_uuid: contract.project_uuid });
      }
    } catch (err) {
      //Update collection status to error
      try {
        contract.contractStatus = ContractStatus.FAILED;
        await contract.update();
      } catch (updateError) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            project_uuid: contract?.project_uuid,
            message: 'Error updating collection status to FAILED.',
            service: ServiceName.COMPUTING,
            err: updateError,
            data: {
              collection: contract.serialize(),
            },
          },
          LogOutput.SYS_ERROR,
        );
      }
      throw err;
    }

    return true;
  }
}
