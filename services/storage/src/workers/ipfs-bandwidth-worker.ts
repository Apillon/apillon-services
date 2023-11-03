import {
  AppEnvironment,
  CodeException,
  Context,
  env,
  Lmas,
  LogType,
  runWithWorkers,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import { BaseWorker, Job, WorkerDefinition } from '@apillon/workers-lib';
import { DbTables, StorageErrorCode } from '../config/types';
import { IpfsBandwidth } from '../modules/ipfs/models/ipfs-bandwidth';
import { IpfsBandwidthSync } from '../modules/ipfs/models/ipfs-bandwidth-sync';
import { Website } from '../modules/hosting/models/website.model';

export class IpfsBandwidthWorker extends BaseWorker {
  protected context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // No used
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`IpfsBandwidthWorker - execute BEGIN: ${data}`);

    const currDate = new Date();
    //Date, from where worker will fetch ipfs traffic data.
    let ipfsTrafficFrom = new Date(
      currDate.getFullYear(),
      currDate.getMonth(),
      1,
    );
    const ipfsTrafficTo = new Date();
    let ipfsTraffic = undefined;

    try {
      //Get last sync date from job table
      const tmpQueryData = await this.context.mysql.paramExecute(
        `
          SELECT * 
          FROM \`${DbTables.IPFS_BANDWIDTH_SYNC}\`
          WHERE status = ${SqlModelStatus.ACTIVE}
          ORDER BY ipfsTrafficTo DESC
          LIMIT 1
          `,
        {},
      );

      if (tmpQueryData.length && tmpQueryData[0].ipfsTrafficTo) {
        ipfsTrafficFrom = tmpQueryData[0].ipfsTrafficTo;
      }

      //Call monitoring service to get ipfs traffic data
      ipfsTraffic = await new Lmas().getIpfsTraffic(
        ipfsTrafficFrom,
        ipfsTrafficTo,
      );
    } catch (err) {
      await new CodeException({
        code: StorageErrorCode.IPFS_BANDWIDTH_WORKER_UNHANDLED_EXCEPTION,
        status: 500,
        context: this.context,
        errorCodes: StorageErrorCode,
        errorMessage:
          'Ipfs bandwidth worker error. Error at getting ipfs traffic',
        details: err,
        sourceFunction: 'IpfsBandwidthWorker.execute',
        sourceModule: ServiceName.STORAGE,
      }).writeToMonitor({
        sendAdminAlert: true,
      });
      return false;
    }

    const conn = await this.context.mysql.start();

    try {
      //For each project increase or insert used bandwidth record;
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
              await new Lmas().writeLog({
                context: this.context,
                data,
                location: 'IpfsBandwidthWorker.execute',
                service: ServiceName.STORAGE,
                logType: LogType.INFO,
                message:
                  'Ipfs traffic without project_uuid and host property has been received.',
              });
              return;
            }
            const website = await new Website(
              {},
              this.context,
            ).populateByDomain(data._id.host, conn);

            if (website.exists()) {
              data._id.project_uuid = website.project_uuid;
            } else {
              return;
            }
          }

          let ipfsBandwidth: IpfsBandwidth = await new IpfsBandwidth(
            {},
            this.context,
          ).populateByProjectAndDate(
            data._id.project_uuid,
            data._id.month,
            data._id.year,
            conn,
          );

          if (ipfsBandwidth.exists()) {
            ipfsBandwidth.bandwidth += data.respBytes;
            await ipfsBandwidth.update(SerializeFor.UPDATE_DB, conn);
          } else {
            ipfsBandwidth = new IpfsBandwidth(
              {
                ...data._id,
                bandwidth: data.respBytes,
              },
              this.context,
            );

            await ipfsBandwidth.insert(SerializeFor.INSERT_DB, conn);
          }
        },
      );

      //Success
      await new IpfsBandwidthSync(
        {
          ipfsTrafficFrom,
          ipfsTrafficTo,
          status: SqlModelStatus.ACTIVE,
        },
        this.context,
      ).insert(SerializeFor.INSERT_DB, conn);

      await this.context.mysql.commit(conn);
    } catch (err) {
      await this.context.mysql.rollback(conn);
      await new IpfsBandwidthSync(
        {
          ipfsTrafficFrom,
          ipfsTrafficTo,
          message: 'Ipfs bandwidth worker error: ' + err.message,
          status: SqlModelStatus.INCOMPLETE,
        },
        this.context,
      ).insert();

      await new CodeException({
        code: StorageErrorCode.IPFS_BANDWIDTH_WORKER_UNHANDLED_EXCEPTION,
        status: 500,
        context: this.context,
        errorCodes: StorageErrorCode,
        errorMessage:
          'Ipfs bandwidth worker error. Error at aggregating ipfs traffic',
        details: err,
        sourceFunction: 'IpfsBandwidthWorker.execute',
        sourceModule: ServiceName.STORAGE,
      }).writeToMonitor({
        sendAdminAlert: true,
      });

      return false;
    }

    return true;
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`IpfsBandwidthWorker - error: ${error}`);
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
