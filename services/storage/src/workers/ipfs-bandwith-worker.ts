import {
  AppEnvironment,
  Context,
  env,
  LogType,
  runWithWorkers,
  ServiceName,
} from '@apillon/lib';
import {
  BaseWorker,
  Job,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { CID } from 'ipfs-http-client';
import { CrustPinningStatus, DbTables } from '../config/types';
import { CrustService } from '../modules/crust/crust.service';
import { PinToCrustRequest } from '../modules/crust/models/pin-to-crust-request.model';
import { Bucket } from '../modules/bucket/models/bucket.model';

export class IpfsBandwithWorker extends BaseWorker {
  protected context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // No used
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`IpfsBandwithWorker - execute BEGIN: ${data}`);

    //Get last sync date from job table
    const tmpQueryData = await this.context.mysql.paramExecute(
      `
        SELECT * 
        FROM \`${DbTables.IPFS_BANDWITH_SYNC}\`
        ORDER BY ipfsTrafficTo DESC
        LIMIT 1
        `,
      {},
    );

    const currDate = new Date();
    //Date, from where worker will fetch ipfs traffic data.
    let ipfsTrafficFrom = new Date(
      currDate.getFullYear(),
      currDate.getMonth(),
      1,
    );

    if (tmpQueryData.length && tmpQueryData[0].ipfsTrafficTo) {
      ipfsTrafficFrom = tmpQueryData[0].ipfsTrafficTo;
    }

    return true;
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`IpfsBandwithWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`DeleteBucketDirectoryFileWorker - update definition: ${this.workerDefinition}`);
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
    // this.logFn('DeleteBucketDirectoryFileWorker - update definition COMPLETE');
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
