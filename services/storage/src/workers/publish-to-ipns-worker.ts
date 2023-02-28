import {
  Context,
  env,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { StorageErrorCode } from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { Ipns } from '../modules/ipns/models/ipns.model';

export class PublishToIPNSWorker extends BaseQueueWorker {
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
    console.info('RUN EXECUTOR (PublishToIPNSWorker). data: ', data);
    const cid = data?.cid;
    const ipns_id = data?.ipns_id;

    if (!cid || !ipns_id) {
      throw new StorageCodeException({
        code: StorageErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    const ipns: Ipns = await new Ipns({}, this.context).populateById(ipns_id);

    try {
      const publishedIpns = await IPFSService.publishToIPNS(
        cid,
        `${ipns.project_uuid}_${ipns.bucket_id}_${ipns.id}`,
      );

      ipns.ipnsName = publishedIpns.name;
      ipns.ipnsValue = publishedIpns.value;
      ipns.status = SqlModelStatus.ACTIVE;

      await ipns.update(SerializeFor.UPDATE_DB);
    } catch (err) {
      await new Lmas().writeLog({
        context: this.context,
        project_uuid: ipns.project_uuid,
        logType: LogType.ERROR,
        message: 'Error at publishing CID to IPNS',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.STORAGE,
        data: {
          data,
          err,
        },
      });
      throw err;
    }

    await new Lmas().writeLog({
      context: this.context,
      project_uuid: ipns.project_uuid,
      logType: LogType.ERROR,
      message: 'Success publishing CID to IPNS',
      location: `${this.constructor.name}/runExecutor`,
      service: ServiceName.STORAGE,
      data: {
        data,
        ipns,
      },
    });

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `PublishToIPNSWorker worker has been completed!`,
    );

    return true;
  }
}
