import {
  AWS_S3,
  Context,
  env,
  LogType,
  runWithWorkers,
  SerializeFor,
  streamToString,
  writeLog,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import {
  BucketType,
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { storageBucketSyncFilesToIPFS } from '../lib/storage-bucket-sync-files-to-ipfs';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { Ipns } from '../modules/ipns/models/ipns.model';

export class PrepareMetadataForCollectionWorker extends BaseQueueWorker {
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
    console.info(
      'RUN EXECUTOR (PrepareMetadataForCollectionWorker). data: ',
      data,
    );

    //#region Load data, execute validations
    //Get sessions
    const imagesSession = await new FileUploadSession(
      {},
      this.context,
    ).populateByUUID(data.imagesSession);

    if (!imagesSession.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
        status: 404,
      });
    }

    const metadataSession = await new FileUploadSession(
      {},
      this.context,
    ).populateByUUID(data.metadataSession);

    if (!metadataSession.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
        status: 404,
      });
    }

    //get bucket
    const bucket = await new Bucket({}, this.context).populateById(
      imagesSession.bucket_id,
    );

    console.info(
      'imageSession, metadataSession and bucket acquired. Getting image FURS...',
    );

    //Get files in session (fileStatus must be of status 1)
    const imageFURs = (
      await new FileUploadRequest(
        {},
        this.context,
      ).populateFileUploadRequestsInSession(imagesSession.id, this.context)
    ).filter(
      (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
    );

    const imageFiles = await storageBucketSyncFilesToIPFS(
      this.context,
      `${this.constructor.name}/runExecutor`,
      bucket,
      5368709120,
      imageFURs,
      imagesSession,
      false,
      undefined,
    );
    //#endregion

    //#region Prepare NFT metadata
    //Download each metadata file from s3, update image property and upload back to s3

    //Get files in session (fileStatus must be of status 1)
    const metadataFURs = (
      await new FileUploadRequest(
        {},
        this.context,
      ).populateFileUploadRequestsInSession(metadataSession.id, this.context)
    ).filter(
      (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
    );
    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();

    console.info(
      'metadataFURs acquired. Starting modification of json files on s3.',
      metadataFURs.map((x) => x.serialize()),
    );

    await runWithWorkers(
      metadataFURs,
      20,
      this.context,
      async (metadataFUR) => {
        if (
          !(await s3Client.exists(
            env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
            metadataFUR.s3FileKey,
          ))
        ) {
          //NOTE: Define flow, what happen in this case. My gues - we should probably throw error
          return;
        }
        const file = await s3Client.get(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          metadataFUR.s3FileKey,
        );

        const fileContent = JSON.parse(
          await streamToString(file.Body, 'utf-8'),
        );
        if (fileContent.image) {
          const imageFile = imageFiles.files.find(
            (x) => x.name == fileContent.image,
          );
          fileContent.image = env.STORAGE_IPFS_GATEWAY + imageFile.CID;
        }

        await s3Client.upload(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          metadataFUR.s3FileKey,
          Buffer.from(JSON.stringify(fileContent), 'utf-8'),
          'application/json',
        );
      },
    );

    console.info(
      'Collection metadata successfully prepared on s3. Starting upload to IPFS.',
    );

    //#endregion

    //#region Sync metadata to IPFS
    for (const fur of metadataFURs) {
      fur.path = 'Metadata/' + fur.path;
    }

    const metadataFiles = await storageBucketSyncFilesToIPFS(
      this.context,
      `${this.constructor.name}/runExecutor`,
      bucket,
      5368709120,
      metadataFURs,
      metadataSession,
      true,
      'Metadata',
    );
    //#endregion

    //#region Publish to IPNS, Pin to IPFS, Remove from S3, ...
    writeLog(
      LogType.INFO,
      'pinning metadata and images to CRUST',
      'prepare-metadata-for-collection-worker.ts',
      'runExecutor',
    );

    console.info(
      `pinning metadata CID (${metadataFiles.wrappedDirCid}) to IPNS`,
    );

    //Pin to IPNS
    const ipnsDbRecord: Ipns = await new Ipns({}, this.context).populateById(
      data.ipnsId,
    );
    const ipnsRecord = await IPFSService.publishToIPNS(
      metadataFiles.wrappedDirCid,
      `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`,
    );
    ipnsDbRecord.ipnsValue = ipnsRecord.value;
    await ipnsDbRecord.update(SerializeFor.UPDATE_DB);

    console.info(`IPNS sucessfully published. Removing files from s3`);

    //Remove all files of this bucket in S3
    await s3Client.removeDirectory(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      `${BucketType[bucket.bucketType]}_sessions/${bucket.id}`,
    );

    writeLog(
      LogType.INFO,
      'PrepareMetadataForCollectionWorker finished!',
      'prepare-metadata-for-collection-worker.ts',
      'runExecutor',
    );

    //#region

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `PrepareMetadataForCollectionWorker worker has been completed!`,
    );

    return true;
  }
}
