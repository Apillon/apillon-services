import {
  AppEnvironment,
  BlockchainMicroservice,
  Context,
  env,
  LogType,
  refundCredit,
  runWithWorkers,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import {
  BaseWorker,
  Job,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { OasisSignature } from '../modules/oasis/models/oasis-signature.model';

/**
 * Worker updates oasis signatures status and refunds credit for signatures, which were not used for Oasis account creation (were not indexed and updated to status ACTIVE in 2 hours)
 */
export class OasisExpiredSignaturesWorker extends BaseWorker {
  protected context: Context;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // No used
  }

  public async execute(data?: any): Promise<any> {
    console.info('RUN EXECUTOR (OasisExpiredSignaturesWorker). data: ', data);

    if (!data.contractId) {
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Invalid parameters for OasisExpiredSignaturesWorker worker',
          service: ServiceName.AUTH,
          data: {
            data,
          },
        },
        LogOutput.SYS_ERROR,
      );
    }

    //get contract from BCS. Worker need to know time of last indexed block
    const contract = await new BlockchainMicroservice(this.context).getContract(
      data.contractId,
    );

    //Substract 2h from last parsed block time so we get date to which signature should be used and indexed
    const expirationDate = new Date(contract.lastParsedBlockTime);
    expirationDate.setHours(expirationDate.getHours() - 2);

    const res = await this.context.mysql.paramExecute(
      `
        SELECT *
        FROM ${DbTables.OASIS_SIGNATURE}
        WHERE status = ${SqlModelStatus.INACTIVE}
        AND createTime < @expirationDate
      `,
      {
        expirationDate,
      },
    );

    await runWithWorkers(
      res,
      5,
      this.context,
      async (oasisSignature: OasisSignature) => {
        oasisSignature = new OasisSignature(oasisSignature, this.context);

        //refund credit
        await refundCredit(
          this.context,
          DbTables.OASIS_SIGNATURE,
          oasisSignature.dataHash,
          'OasisExpiredSignaturesWorker.execute',
          ServiceName.AUTH,
        );

        oasisSignature.status = 100;
        await oasisSignature.update();
      },
    );

    return true;
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`OasisExpiredSignaturesWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
