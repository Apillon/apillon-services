import {
  AppEnvironment,
  Context,
  Lmas,
  LogType,
  ServiceName,
  env,
} from '@apillon/lib';
import { BaseWorker, Job, WorkerDefinition } from '@apillon/workers-lib';
import { IpfsCluster } from '../modules/ipfs/models/ipfs-cluster.model';
import { IpfsKuboRpcHttpClient } from '@apillon/ipfs-kubo-rpc-http-client';

const sendAlert = async (loggingMS: Lmas, message: string) => {
  await loggingMS.writeLog({
    logType: LogType.ALERT,
    message,
    location: 'IpfsMonitorWorker.execute',
    service: ServiceName.STORAGE,
    sendAdminAlert: true,
  });
};

/**
 * Worker that monitors the status of active IPFS clusters and sends alerts for any non-responsive clusters.
 */
export class IpfsMonitorWorker extends BaseWorker {
  protected context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // No used
  }

  public async execute(data?: any): Promise<any> {
    this.logFn('IpfsMonitorWorker - execute BEGIN');

    const clusters = await new IpfsCluster({}, this.context).findActive();

    const loggingMS = new Lmas();

    await Promise.all(
      clusters.map(async (cluster) => {
        const ipfsClient = new IpfsKuboRpcHttpClient(cluster.ipfsApi);

        try {
          await ipfsClient.version(2000);
        } catch (err) {
          if (cluster.backupIpfsApi) {
            const backupIpfsClient = new IpfsKuboRpcHttpClient(
              cluster.backupIpfsApi,
            );

            try {
              await backupIpfsClient.version(1000);
            } catch (err1) {
              await sendAlert(
                loggingMS,
                `IpfsMonitorWorker - Backup IPFS Cluster ${cluster.backupIpfsApi} of ${cluster.ipfsApi} is not responding`,
              );
            }
          } else {
            await sendAlert(
              loggingMS,
              `IpfsMonitorWorker - IPFS Cluster ${cluster.ipfsApi} is not responding`,
            );
          }
        }
      }),
    );
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // No used
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`IpfsMonitorWorker - error: ${error}`);
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
