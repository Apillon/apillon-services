import {
  Context,
  env,
  LogType,
  QuotaCode,
  Scs,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  BucketType,
  FileUploadRequestFileStatus,
  FileUploadSessionStatus,
  StorageErrorCode,
} from '../config/types';
import { sendTransferredFilesToBucketWebhook } from '../lib/bucket-webhook';
import { StorageCodeException } from '../lib/exceptions';
import { storageBucketSyncFilesToIPFS } from '../lib/storage-bucket-sync-files-to-ipfs';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';

export class SyncToIPFSWorker extends BaseQueueWorker {
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
    // console.info('RUN EXECUTOR (SyncToIPFSWorker). data: ', data);

    await this.writeEventLog({
      logType: LogType.INFO,
      message: 'Sync to IPFS worker started',
      service: ServiceName.STORAGE,
      data,
    });

    const session_uuid = data?.session_uuid;
    let files = [];
    let bucket: Bucket = undefined;
    let session: FileUploadSession = undefined;

    if (session_uuid) {
      //Get session
      session = await new FileUploadSession({}, this.context).populateByUUID(
        session_uuid,
      );

      if (!session.exists()) {
        throw new StorageCodeException({
          code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
          status: 404,
        });
      }
      //get bucket
      bucket = await new Bucket({}, this.context).populateById(
        session.bucket_id,
      );

      //Get files in session (fileStatus must be of status 1)
      files = (
        await new FileUploadRequest(
          {},
          this.context,
        ).populateFileUploadRequestsInSession(session.id, this.context)
      ).filter(
        (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
      );
    }
    //Check if message from s3
    else if (data.Records && data.Records.length > 0) {
      for (const record of data.Records) {
        const tmpFur = await new FileUploadRequest(
          {},
          this.context,
        ).populateByS3FileKey(
          decodeURIComponent(record.s3.object.key).replace(/\+/g, ' '),
        );

        if (
          tmpFur.exists() &&
          tmpFur.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED
        ) {
          if (bucket == undefined) {
            //get bucket
            bucket = await new Bucket({}, this.context).populateById(
              tmpFur.bucket_id,
            );
          }
          //Update file-upload-request status
          tmpFur.fileStatus = FileUploadRequestFileStatus.UPLOADED_TO_S3;
          await tmpFur.update();
          //Push to files, that will be processed
          files.push(tmpFur);
        } else {
          throw new StorageCodeException({
            code: StorageErrorCode.FILE_UPLOAD_REQUEST_NOT_FOUND,
            status: 500,
          });
        }
      }
    } else {
      throw new StorageCodeException({
        code: StorageErrorCode.INVALID_BODY_FOR_WORKER,
        status: 500,
      });
    }

    if (files.length > 0) {
      let maxBucketSize = 5_368_709_120;
      //get max bucket size quota and check if bucket is at max size
      const maxBucketSizeQuota = await new Scs(this.context).getQuota({
        quota_id: QuotaCode.MAX_BUCKET_SIZE,
        project_uuid: bucket.project_uuid,
        object_uuid: bucket.bucket_uuid,
      });
      if (maxBucketSizeQuota?.value) {
        maxBucketSize = maxBucketSizeQuota.value * 1_073_741_824; //quota is in GB - convert to bytes
      }

      let transferedFiles = [];

      if (bucket.bucketType == BucketType.STORAGE) {
        transferedFiles = (
          await storageBucketSyncFilesToIPFS(
            this.context,
            `${this.constructor.name}/runExecutor`,
            bucket,
            maxBucketSize,
            files,
            session,
            data?.wrapWithDirectory,
            data?.wrappingDirectoryName,
          )
        ).files;
      } else {
        throw new StorageCodeException({
          code: StorageErrorCode.INVALID_BUCKET_TYPE_FOR_IPFS_SYNC_WORKER,
          status: 400,
        });
      }

      //update session status
      if (session) {
        session.sessionStatus = FileUploadSessionStatus.FINISHED;
        await session.update();
      }

      //if webhook is set for this bucket, SEND POST request with transferred data
      await sendTransferredFilesToBucketWebhook(
        this.context,
        bucket,
        transferedFiles,
      );

      await this.writeEventLog({
        logType: LogType.INFO,
        message: 'Sync to IPFS worker completed',
        service: ServiceName.STORAGE,
        data: {
          transferedFiles,
          data,
        },
      });
    } else {
      console.info('NO FILES FOR TRANSFER!');
    }

    return true;
  }
}
