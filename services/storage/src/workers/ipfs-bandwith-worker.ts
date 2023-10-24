import {
  AppEnvironment,
  Context,
  env,
  Lmas,
  runWithWorkers,
} from '@apillon/lib';
import { BaseWorker, Job, WorkerDefinition } from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { IpfsBandwith } from '../modules/ipfs/models/ipfs-bandwith';

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

    //Call monitoring service to get ipfs traffic data
    const ipfsTraffic = await new Lmas().getIpfsTraffic(ipfsTrafficFrom);

    //For each project increase or insert used bandwith record
    await runWithWorkers(
      ipfsTraffic.data.filter((x) => x._id.project_uuid),
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
        ? 1
        : 5,
      this.context,
      async (data: {
        _id: {
          project_uuid?: string;
          month: number;
          year: number;
        };
        respBytes: number;
      }) => {
        let ipfsBandwith: IpfsBandwith = await new IpfsBandwith(
          {},
          this.context,
        ).populateByProjectAndDate(
          data._id.project_uuid,
          data._id.month,
          data._id.year,
        );

        if (ipfsBandwith.exists()) {
          ipfsBandwith.bandwith += data.respBytes;
          await ipfsBandwith.update();
        } else {
          ipfsBandwith = new IpfsBandwith(
            {
              ...data._id,
              bandwith: data.respBytes,
            },
            this.context,
          );

          await ipfsBandwith.insert();
        }
      },
    );

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
