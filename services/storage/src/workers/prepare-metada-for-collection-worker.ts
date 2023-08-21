import {
  AWS_S3,
  Context,
  env,
  LogType,
  runWithWorkers,
  SerializeFor,
  ServiceName,
  streamToString,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
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
import { Ipns } from '../modules/ipns/models/ipns.model';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { File } from '../modules/storage/models/file.model';

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
    const imageFURs = await new FileUploadRequest(
      {},
      this.context,
    ).populateFileUploadRequestsInSession(imagesSession.id, this.context);

    /*Upload nft images to IPFS. Upload only FURs, that were not yed uploaded.
    Something may fail and it is possible, that some or all images were already uploaded to IPFS. In this case, retrieve existing uploaded images.*/
    const imageFiles =
      imageFURs.filter(
        (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
      ).length > 0
        ? await storageBucketSyncFilesToIPFS(
            this.context,
            `${this.constructor.name}/runExecutor`,
            bucket,
            5_368_709_120,
            imageFURs.filter(
              (x) =>
                x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
            ),
            imagesSession,
            false,
            undefined,
          )
        : { files: [], wrappedDirCid: undefined };
    if (
      imageFURs.filter(
        (x) => x.fileStatus == FileUploadRequestFileStatus.UPLOAD_COMPLETED,
      ).length > 0
    ) {
      //get uploaded files and add them to imageFiles object
      for (const f of imageFURs.filter(
        (x) => x.fileStatus == FileUploadRequestFileStatus.UPLOAD_COMPLETED,
      )) {
        const tmpFile: File = await new File({}, this.context).populateByUUID(
          f.file_uuid,
        );
        imageFiles.files.push(tmpFile);
      }
    }

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

    const metadataFiles = await storageBucketSyncFilesToIPFS(
      this.context,
      `${this.constructor.name}/runExecutor`,
      bucket,
      5_368_709_120,
      metadataFURs,
      metadataSession,
      true,
      'Metadata',
    );
    //#endregion

    //#region Publish to IPNS, Pin to IPFS, Remove from S3, ...

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
    ipnsDbRecord.key = `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`;
    ipnsDbRecord.cid = metadataFiles.wrappedDirCid;
    await ipnsDbRecord.update(SerializeFor.UPDATE_DB);

    console.info(`IPNS sucessfully published. Removing files from s3`);

    //Remove all files of this bucket in S3
    await s3Client.removeDirectory(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      `${BucketType[bucket.bucketType]}_sessions/${bucket.id}`,
    );

    await this.writeEventLog({
      logType: LogType.INFO,
      project_uuid: bucket.project_uuid,
      message: 'PrepareMetadataForCollectionWorker finished!',
      service: ServiceName.STORAGE,
      data: {
        data,
        ipnsRecord,
      },
    });

    //#endregion

    return true;
  }
}
