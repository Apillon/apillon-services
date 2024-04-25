import {
  Context,
  EndFileUploadSessionDto,
  env,
  LogType,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  sendToWorkerQueue,
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
import { processSessionFiles } from '../lib/process-session-files';
import { storageBucketSyncFilesToIPFS } from '../lib/storage-bucket-sync-files-to-ipfs';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { WorkerName } from './worker-executor';

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
    console.info('RUN EXECUTOR (SyncToIPFSWorker). data: ', data);

    const processFilesInSyncWorker = data?.processFilesInSyncWorker;
    const session_uuid = data?.session_uuid;
    data.wrappingDirectoryPath = data?.wrappingDirectoryPath?.trim();

    let files = [];
    let bucket: Bucket = undefined;
    let session: FileUploadSession = undefined;

    if (!session_uuid) {
      throw new StorageCodeException({
        code: StorageErrorCode.INVALID_BODY_FOR_WORKER,
        status: 500,
      });
    }

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
    bucket = await new Bucket({}, this.context).populateById(session.bucket_id);

    if (processFilesInSyncWorker) {
      //Files were not processed in endSession endpoint. Because of large amount of files in session, execute file process here
      await processSessionFiles(
        this.context,
        bucket,
        session,
        new EndFileUploadSessionDto().populate({
          wrapWithDirectory: data?.wrapWithDirectory,
          directoryPath: data?.wrappingDirectoryPath,
        }),
      );
    }

    //Get files in session that were not yet transferred
    files = (
      await new FileUploadRequest(
        {},
        this.context,
      ).populateFileUploadRequestsInSession(session.id, this.context)
    ).filter(
      (x) =>
        x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED &&
        x.fileStatus != FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3,
    );

    if (files.length > 0) {
      let transferredFiles = [];

      if (
        bucket.bucketType == BucketType.STORAGE ||
        bucket.bucketType == BucketType.NFT_METADATA
      ) {
        transferredFiles = (
          await storageBucketSyncFilesToIPFS(
            this.context,
            `${this.constructor.name}/runExecutor`,
            bucket,
            files.slice(0, env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS),
            data?.wrapWithDirectory,
            data?.wrappingDirectoryPath,
          )
        ).files;
      } else {
        throw new StorageCodeException({
          code: StorageErrorCode.INVALID_BUCKET_TYPE_FOR_IPFS_SYNC_WORKER,
          status: 400,
        });
      }

      //if webhook is set for this bucket, SEND POST request with transferred data
      await sendTransferredFilesToBucketWebhook(
        this.context,
        bucket,
        transferredFiles,
      );

      await this.writeEventLog({
        logType: LogType.INFO,
        project_uuid: bucket.project_uuid,
        message: `Sync to IPFS worker completed. Uploaded ${transferredFiles.length}/${files.length}`,
        service: ServiceName.STORAGE,
        data: {
          transferedFiles: transferredFiles,
          data,
        },
      });
    }

    //update session status
    if (files.length <= env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS) {
      session.sessionStatus = FileUploadSessionStatus.FINISHED;
      await session.update();
    } else {
      //Send message to sqs to start upload of next batch
      console.info('Sending remaining files to another sync iteration.');
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.SYNC_TO_IPFS_WORKER,
        [
          {
            ...data,
            processFilesInSyncWorker: false, //Files were processed in first iteration
          },
        ],
        null,
        null,
        files.length > env.STORAGE_NUM_OF_FILES_IN_SESSION_WITHOUT_DELAY
          ? 900
          : 0, //Delay message for 15 mins if more than 2k files in session
      );
    }

    return true;
  }
}
