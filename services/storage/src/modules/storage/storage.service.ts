import {
  AppEnvironment,
  AWS_S3,
  CreateS3UrlsForUploadDto,
  EndFileUploadSessionDto,
  env,
  FileUploadsQueryFilter,
  Lmas,
  LogType,
  QuotaCode,
  runWithWorkers,
  Scs,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  TrashedFilesQueryFilter,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  BucketType,
  FileStatus,
  FileUploadSessionStatus,
  StorageErrorCode,
} from '../../config/types';
import { createFURAndS3Url } from '../../lib/create-fur-and-s3-url';
import { StorageCodeException } from '../../lib/exceptions';
import { processSessionFiles } from '../../lib/process-session-files';
import { SyncToIPFSWorker } from '../../workers/s3-to-ipfs-sync-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
import { HostingService } from '../hosting/hosting.service';
import { FileUploadRequest } from './models/file-upload-request.model';
import { FileUploadSession } from './models/file-upload-session.model';
import { File } from './models/file.model';
import { Website } from '../hosting/models/website.model';
import { getSessionFilesOnS3 } from '../../lib/file-upload-session-s3-files';

export class StorageService {
  //#region file-upload functions

  static async generateMultipleS3UrlsForUpload(
    event: { body: CreateS3UrlsForUploadDto },
    context: ServiceContext,
  ): Promise<any> {
    //First create fileUploadSession & fileUploadRequest records in DB, then generate S3 signed urls for upload

    //get bucket
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );

    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    } else if (bucket.status == SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_IS_MARKED_FOR_DELETION,
        status: 404,
      });
    }
    bucket.canAccess(context);

    //Check if enough storage is available
    const storageUsed = await bucket.getTotalSizeUsedByProject();
    const maxStorageQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_STORAGE,
      project_uuid: bucket.project_uuid,
    });
    const maxStorage = (maxStorageQuota?.value || 3) * 1073741824;
    if (storageUsed >= maxStorage) {
      throw new StorageCodeException({
        code: StorageErrorCode.NOT_ENOUGH_STORAGE_SPACE,
        status: 400,
      });
    }

    //Get existing or create new fileUploadSession
    let session: FileUploadSession;
    if (event.body.session_uuid) {
      session = undefined;
      session = await new FileUploadSession({}, context).populateByUUID(
        event.body.session_uuid,
      );

      if (!session.exists()) {
        //create new session
        session = new FileUploadSession(
          {
            session_uuid: event.body.session_uuid,
            bucket_id: bucket.id,
            project_uuid: bucket.project_uuid,
          },
          context,
        );
        await session.insert();
      } else if (session.bucket_id != bucket.id) {
        throw new StorageCodeException({
          code: StorageErrorCode.SESSION_UUID_BELONGS_TO_OTHER_BUCKET,
          status: 400,
        });
      } else if (session.sessionStatus != FileUploadSessionStatus.CREATED) {
        throw new StorageCodeException({
          code: StorageErrorCode.FILE_UPLOAD_SESSION_ALREADY_TRANSFERED,
          status: 400,
        });
      }
    } else {
      //create new session
      session = new FileUploadSession(
        {
          session_uuid: uuidV4(),
          bucket_id: bucket.id,
          project_uuid: bucket.project_uuid,
        },
        context,
      );
      await session.insert();
    }

    const s3Client: AWS_S3 = new AWS_S3();

    const files = [];
    await runWithWorkers(
      event.body.files,
      50,
      context,
      async (fileMetadata) => {
        //NOTE - session uuid is added to s3File key.
        /*File key structure:
         * Bucket type(STORAGE, STORAGE_sessions, HOSTING)/bucket id/session uuid if present/path/filename
         */
        const s3FileKey = `${BucketType[bucket.bucketType]}${
          session?.session_uuid ? '_sessions' : ''
        }/${bucket.id}${
          session?.session_uuid ? '/' + session.session_uuid : ''
        }/${
          (fileMetadata.path ? fileMetadata.path : '') + fileMetadata.fileName
        }`;

        files.push(
          await createFURAndS3Url(
            context,
            s3FileKey,
            fileMetadata,
            session,
            bucket,
            s3Client,
          ),
        );
      },
    );

    await new Lmas().writeLog({
      context: context,
      project_uuid: bucket.project_uuid,
      logType: LogType.INFO,
      message: 'S3 urls for upload requested',
      location: `${this.constructor.name}/runExecutor`,
      service: ServiceName.STORAGE,
      data: {
        session: session.serialize(),
        numOfFiles: event.body.files.length,
      },
    });

    return {
      session_uuid: session?.session_uuid,
      files: files,
    };
  }

  static async endFileUploadSession(
    event: {
      session_uuid: string;
      body: EndFileUploadSessionDto;
    },
    context: ServiceContext,
  ): Promise<any> {
    // Get session
    const session = await new FileUploadSession({}, context).populateByUUID(
      event.session_uuid,
    );
    if (!session.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
        status: 404,
      });
    }

    //get bucket
    const bucket = await new Bucket({}, context).populateById(
      session.bucket_id,
    );
    bucket.canAccess(context);

    if (session.sessionStatus == FileUploadSessionStatus.FINISHED) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_ALREADY_TRANSFERED,
        status: 400,
      });
    }

    if (
      bucket.bucketType == BucketType.STORAGE ||
      bucket.bucketType == BucketType.NFT_METADATA
    ) {
      if (session.sessionStatus == FileUploadSessionStatus.CREATED) {
        await processSessionFiles(context, bucket, session, event.body);
      }
      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        if (event.body.directSync) {
          //Directly calls worker, to sync files to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
          const serviceDef: ServiceDefinition = {
            type: ServiceDefinitionType.SQS,
            config: { region: 'test' },
            params: { FunctionName: 'test' },
          };
          const parameters = {
            session_uuid: session.session_uuid,
            wrapWithDirectory: event.body.wrapWithDirectory,
            wrappingDirectoryPath: event.body.directoryPath,
          };
          const wd = new WorkerDefinition(
            serviceDef,
            WorkerName.SYNC_TO_IPFS_WORKER,
            {
              parameters,
            },
          );

          const worker = new SyncToIPFSWorker(
            wd,
            context,
            QueueWorkerType.EXECUTOR,
          );
          await worker.runExecutor({
            session_uuid: session.session_uuid,
            wrapWithDirectory: event.body.wrapWithDirectory,
            wrappingDirectoryName: event.body.directoryPath,
          });
        }
      } else {
        //send message to SQS
        await sendToWorkerQueue(
          env.STORAGE_AWS_WORKER_SQS_URL,
          WorkerName.SYNC_TO_IPFS_WORKER,
          [
            {
              session_uuid: session.session_uuid,
              wrapWithDirectory: event.body.wrapWithDirectory,
              wrappingDirectoryName: event.body.directoryPath,
            },
          ],
          null,
          null,
        );
      }
    } else if (bucket.bucketType == BucketType.HOSTING) {
      await processSessionFiles(context, bucket, session, event.body);
      //Increase size of bucket - files on website source bucket will never be transferred to ipfs, so the size of bucket won't be increased.
      const filesOnS3 = await getSessionFilesOnS3(
        bucket,
        session?.session_uuid,
      );
      bucket.size += filesOnS3.size;
      await bucket.update();
    }

    return true;
  }

  /**
   * This function is used only for development & testing purposes.
   * In other envirinments, s3 sends this message to queuq automatically, when file is uploaded
   * @param event
   * @param context
   * @returns
   */
  static async endFileUpload(
    event: {
      file_uuid: string;
    },
    context: ServiceContext,
  ): Promise<any> {
    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      //Get file upload request
      const fur = await new FileUploadRequest({}, context).populateByUUID(
        event.file_uuid,
      );
      if (!fur.exists()) {
        throw new StorageCodeException({
          code: StorageErrorCode.FILE_UPLOAD_REQUEST_NOT_FOUND,
          status: 404,
        });
      }

      const msg = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'eu-west-1',
            eventTime: '2022-12-12T07:15:18.165Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: { principalId: 'AWS:AIDAQIMRRA6GKZX7GJVNU' },
            requestParameters: { sourceIPAddress: '89.212.22.116' },
            responseElements: {
              'x-amz-request-id': 'D3KVZ7C5RRZPJ2SR',
              'x-amz-id-2':
                'vPrPgHDXn7A17ce6P+XdUZG2WJufvOJoalcS5vvPzEPKDtm5LZSFN3TjuNrRa3hv72sJICDfSGtM3gpXLilE1EMDl3qUINUA',
            },
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'File uploaded to storage directory',
              bucket: {
                name: 'sync-to-ipfs-queue',
                ownerIdentity: { principalId: 'A22UA2G16O19KV' },
                arn: 'arn:aws:s3:::sync-to-ipfs-queue',
              },
              object: {
                key: fur.s3FileKey,
                size: fur.size,
                eTag: 'efea4f1606e3d37048388cc4bebacea6',
                sequencer: '006396D50624FE22EB',
              },
            },
          },
        ],
      };

      //Directly calls worker, to sync file to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const parameters = msg;
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.SYNC_TO_IPFS_WORKER,
        { parameters },
      );

      const worker = new SyncToIPFSWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor(msg);

      return true;
    }
    return false;
  }

  static async listFileUploads(
    event: { query: FileUploadsQueryFilter },
    context: ServiceContext,
  ) {
    return await new FileUploadRequest({}, context).getList(
      context,
      new FileUploadsQueryFilter(event.query),
    );
  }

  //#endregion

  //#region file functions

  static async getFileDetails(event: { id: string }, context: ServiceContext) {
    let file: File = undefined;
    let fileStatus: FileStatus = undefined;
    if (event.id) {
      file = await new File({}, context).populateById(event.id);
    } else {
      throw new StorageCodeException({
        code: StorageErrorCode.DEFAULT_RESOURCE_NOT_FOUND_ERROR,
        status: 404,
      });
    }

    if (!file.exists()) {
      //try to load and return file data from file-upload-request
      const fur: FileUploadRequest = await new FileUploadRequest(
        {},
        context,
      ).populateByUUID(event.id);

      if (fur.exists()) {
        await fur.canAccess(context);
        //check if file uploaded to S3
        const s3Client: AWS_S3 = new AWS_S3();
        if (
          await s3Client.exists(
            env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
            fur.s3FileKey,
          )
        ) {
          fileStatus = FileStatus.UPLOADED_TO_S3;
        } else {
          fileStatus = FileStatus.REQUEST_FOR_UPLOAD_GENERATED;
        }

        return {
          fileStatus: fileStatus,
          file: fur.serialize(SerializeFor.PROFILE),
          crustStatus: undefined,
        };
      }

      throw new StorageCodeException({
        code: StorageErrorCode.FILE_DOES_NOT_EXISTS,
        status: 404,
      });
    }

    file.canAccess(context);
    fileStatus = FileStatus.UPLOADED_TO_IPFS;
    //File exists on IPFS and probably on CRUST- get status from CRUST
    if (file.CID) {
      fileStatus = FileStatus.PINNED_TO_CRUST;
      file.downloadLink = env.STORAGE_IPFS_GATEWAY + file.CID;
    }

    return {
      fileStatus: fileStatus,
      file: file.serialize(SerializeFor.PROFILE),
    };
  }

  static async deleteFile(
    event: { id: string },
    context: ServiceContext,
  ): Promise<any> {
    const f: File = await new File({}, context).populateById(event.id);
    if (!f.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_NOT_FOUND,
        status: 404,
      });
    } else if (f.status == SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_ALREADY_MARKED_FOR_DELETION,
        status: 400,
      });
    }
    f.canModify(context);

    //check bucket
    const b: Bucket = await new Bucket({}, context).populateById(f.bucket_id);
    if (
      b.bucketType == BucketType.STORAGE ||
      b.bucketType == BucketType.NFT_METADATA
    ) {
      await f.markForDeletion();
      return f.serialize(SerializeFor.PROFILE);
    } else if (b.bucketType == BucketType.HOSTING) {
      return await HostingService.deleteFile({ file: f }, context);
    } else {
      return false;
    }
  }

  static async unmarkFileForDeletion(
    event: { id: string },
    context: ServiceContext,
  ): Promise<any> {
    const f: File = await new File({}, context).populateById(event.id);
    if (!f.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_NOT_FOUND,
        status: 404,
      });
    } else if (f.status != SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_NOT_MARKED_FOR_DELETION,
        status: 400,
      });
    }
    f.canModify(context);

    f.status = SqlModelStatus.ACTIVE;

    await f.update();

    return f.serialize(SerializeFor.PROFILE);
  }

  static async listFilesMarkedForDeletion(
    event: { query: TrashedFilesQueryFilter },
    context: ServiceContext,
  ) {
    return await new File({}, context).getMarkedForDeletionList(
      context,
      new TrashedFilesQueryFilter(event.query, context),
    );
  }

  /**
   * Get project storage details - num. of buckets, total bucket size, num. of websites
   * @param {{ project_uuid: string }} - uuid of the project
   * @param {ServiceContext} context
   */
  static async getProjectStorageDetails(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const bucketDetails = await new Bucket(
      { project_uuid },
      context,
    ).getDetailsForProject();
    const numOfWebsites = await new Website(
      { project_uuid },
      context,
    ).getNumOfWebsites();

    return { ...bucketDetails, numOfWebsites };
  }
  //#endregion
}
