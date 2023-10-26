import {
  AppEnvironment,
  CodeException,
  Context,
  env,
  Lmas,
  runWithWorkers,
  ServiceName,
} from '@apillon/lib';
import { BaseWorker, Job, WorkerDefinition } from '@apillon/workers-lib';
import { DbTables, StorageErrorCode } from '../config/types';
import { IpfsBandwith } from '../modules/ipfs/models/ipfs-bandwith';
import { IpfsBandwithSync } from '../modules/ipfs/models/ipfs-bandwith-sync';
import { Website } from '../modules/hosting/models/website.model';

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

    const currDate = new Date();
    //Date, from where worker will fetch ipfs traffic data.
    let ipfsTrafficFrom = new Date(
      currDate.getFullYear(),
      currDate.getMonth(),
      1,
    );
    const ipfsTrafficTo = new Date();

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

    if (tmpQueryData.length && tmpQueryData[0].ipfsTrafficTo) {
      ipfsTrafficFrom = tmpQueryData[0].ipfsTrafficTo;
    }

    try {
      //Call monitoring service to get ipfs traffic data
      const ipfsTraffic = await new Lmas().getIpfsTraffic(
        ipfsTrafficFrom,
        ipfsTrafficTo,
      );

      //For each project increase or insert used bandwith record
      await runWithWorkers(
        ipfsTraffic.data,
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
          env.APP_ENV == AppEnvironment.TEST
          ? 1
          : 5,
        this.context,
        async (data: {
          _id: {
            project_uuid?: string;
            host?: string;
            month: number;
            year: number;
          };
          respBytes: number;
        }) => {
          if (!data._id.project_uuid) {
            //If project_uuid is not specified, then traffic is from hosting. Try to get project by host (host = website.domain)
            if (!data._id.host) {
              return;
            }
            const website = await new Website(
              {},
              this.context,
            ).populateByDomain(data._id.host);

            if (website.exists()) {
              data._id.project_uuid = website.project_uuid;
            } else {
              return;
            }
          }

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

      //Success
      await new IpfsBandwithSync(
        {
          ipfsTrafficFrom,
          ipfsTrafficTo,
        },
        this.context,
      ).insert();
    } catch (err) {
      await new IpfsBandwithSync(
        {
          ipfsTrafficFrom,
          ipfsTrafficTo,
          message: 'Ipfs bandwith worker error: ' + err.message,
        },
        this.context,
      ).insert();

      await new CodeException({
        code: StorageErrorCode.IPFS_BANDWITH_WORKER_UNHANDLED_EXCEPTION,
        status: 500,
        context: this.context,
        errorCodes: StorageErrorCode,
        errorMessage: 'Ipfs bandwith worker error.',
        details: err,
        sourceFunction: 'IpfsBandwithWorker.execute',
        sourceModule: ServiceName.STORAGE,
      }).writeToMonitor({
        sendAdminAlert: true,
      });
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
