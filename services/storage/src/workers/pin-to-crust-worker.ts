import { Context, env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { DbTables, FileStatus, StorageErrorCode } from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { CrustService } from '../modules/crust/crust.service';
import { File } from '../modules/storage/models/file.model';

export class PinToCRUSTWorker extends BaseQueueWorker {
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
    console.info('RUN EXECUTOR (PinToCRUSTWorker). data: ', data);
    const CID = data?.CID;
    const size = data?.size;
    const bucket_uuid = data?.bucket_uuid;
    const isDirectory = data?.isDirectory;

    if (!CID || !size || !bucket_uuid) {
      throw new StorageCodeException({
        code: StorageErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    const bucket: Bucket = await new Bucket({}, this.context).populateByUUID(
      bucket_uuid,
    );
    const file: File = await new File({}, this.context).populateById(CID);

    try {
      const res = await CrustService.placeStorageOrderToCRUST(
        {
          cid: CID,
          size: size,
          isDirectory: isDirectory,
          refTable: DbTables.FILE,
          refId: file?.file_uuid,
        },
        this.context,
      );
      console.log(res);
      await new Lmas().writeLog({
        context: this.context,
        project_uuid: bucket.project_uuid,
        logType: LogType.COST,
        message: 'Success placing storage order to CRUST',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.STORAGE,
        data: data,
      });
      //if file, then update file status
      if (file.exists()) {
        file.fileStatus = FileStatus.PINNING_TO_CRUST;
        await file.update();
      }
    } catch (err) {
      await new Lmas().writeLog({
        context: this.context,
        project_uuid: bucket.project_uuid,
        logType: LogType.ERROR,
        message: 'Error at placing storage order to CRUST',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.STORAGE,
        data: {
          data,
          err,
        },
      });
      throw err;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `PinToCRUST worker has been completed!`,
    );

    return true;
  }
}
