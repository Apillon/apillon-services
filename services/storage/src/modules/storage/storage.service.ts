import {
  AppEnvironment,
  AWS_S3,
  CreateS3SignedUrlForUploadDto,
  EndFileUploadSessionDto,
  env,
  PoolConnection,
  SerializeFor,
} from '@apillon/lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { CID } from 'ipfs-http-client';
import { v4 as uuidV4 } from 'uuid';
import { FileStatus, StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { SyncToIPFSWorker } from '../../workers/s3-to-ipfs-sync-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
import { CrustService } from '../crust/crust.service';
import { Directory } from '../directory/models/directory.model';
import { FileUploadRequest } from './models/file-upload-request.model';
import { FileUploadSession } from './models/file-upload-session.model';
import { File } from './models/file.model';

export class StorageService {
  static async generateS3SignedUrlForUpload(
    event: { body: CreateS3SignedUrlForUploadDto },
    context: ServiceContext,
  ): Promise<any> {
    //First create fileUploadSession & fileUploadRequest records in DB, then generate S3 signed url for upload

    //get bucket
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );

    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    bucket.canAccess(context);

    //Get existing or create new fileUploadSession
    let session: FileUploadSession = undefined;
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
        status: 404,
      });
    } else if (session.sessionStatus == 2) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_ALREADY_TRANSFERED,
        status: 404,
      });
    }

    const s3FileKey = `${bucket.id}/${session.session_uuid}/${
      (event.body.path ? event.body.path : '') + event.body.fileName
    }`;

    //check if fileUploadRequest with that key already exists
    let fur: FileUploadRequest = await new FileUploadRequest(
      {},
      context,
    ).populateByS3FileKey(s3FileKey);

    if (!fur.exists()) {
      fur = new FileUploadRequest(event.body, context).populate({
        file_uuid: uuidV4(),
        session_id: session?.id,
        bucket_id: bucket.id,
        s3FileKey: s3FileKey,
      });

      await fur.insert();
    } else {
      //Only update time & user is updated
      await fur.update();
    }

    const s3Client: AWS_S3 = new AWS_S3();
    const signedURLForUpload = await s3Client.generateSignedUploadURL(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      s3FileKey,
    );

    return {
      signedUrlForUpload: signedURLForUpload,
      file_uuid: fur.file_uuid,
      fileUploadRequestId: fur.id,
    };
  }

  static async endFileUploadSession(
    event: {
      session_uuid: string;
      body: EndFileUploadSessionDto;
    },
    context: ServiceContext,
  ): Promise<any> {
    //Get session
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

    if (session.sessionStatus != 1) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_ALREADY_TRANSFERED,
        status: 400,
      });
    }

    if (
      event.body.directSync &&
      (env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST)
    ) {
      //Directly calls worker, to sync files to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const parameters = {
        session_uuid: session.session_uuid,
      };
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
      await worker.runExecutor({ session_uuid: session.session_uuid });
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.SYNC_TO_IPFS_WORKER,
        [
          {
            session_uuid: session.session_uuid,
          },
        ],
        null,
        null,
      );
    }

    return true;
  }

  /**
   * From string path generates directories with hiearhical structure
   */
  static async generateDirectoriesFromPath(
    context: ServiceContext,
    directories: Directory[],
    fur: FileUploadRequest,
    bucket: Bucket,
    ipfsDirectories?: { path: string; cid: CID }[],
    conn?: PoolConnection,
  ) {
    if (fur.path) {
      const splittedPath: string[] = fur.path.split('/').filter((x) => x != '');
      let currDirectory = undefined;

      //Get or create directory
      for (let i = 0; i < splittedPath.length; i++) {
        const currChildDirectories =
          i == 0
            ? directories.filter((x) => x.parentDirectory_id == undefined)
            : directories.filter(
                (x) => x.parentDirectory_id == currDirectory.id,
              );

        const existingDirectory = currChildDirectories.find(
          (x) => x.name == splittedPath[i],
        );

        if (!existingDirectory) {
          //create new directory
          const newDirectory: Directory = new Directory({}, context).populate({
            directory_uuid: uuidV4(),
            project_uuid: bucket.project_uuid,
            bucket_id: fur.bucket_id,
            parentDirectory_id: currDirectory?.id,
            name: splittedPath[i],
          });

          //search, if directory with that path, was created on IPFS
          const ipfsDirectory = ipfsDirectories?.find(
            (x) => x.path == splittedPath.slice(0, i + 1).join('/'),
          );
          if (ipfsDirectory)
            newDirectory.CID = ipfsDirectory.cid.toV0().toString();

          try {
            await newDirectory.validate();
          } catch (err) {
            await newDirectory.handle(err);
            if (!newDirectory.isValid())
              throw new StorageValidationException(newDirectory);
          }

          currDirectory = await newDirectory.insert(
            SerializeFor.INSERT_DB,
            conn,
          );

          //Add new directory to list of all directories
          directories.push(currDirectory);
        } else currDirectory = existingDirectory;
      }
      return currDirectory;
    }
    return undefined;
  }

  static async getFileDetails(
    event: { cid?: string; file_uuid?: string },
    context: ServiceContext,
  ) {
    let file: File = undefined;
    let fileStatus: FileStatus = undefined;
    if (event.cid) file = await new File({}, context).populateByCID(event.cid);
    else if (event.file_uuid)
      file = await new File({}, context).populateByUUID(event.file_uuid);
    else {
      throw new StorageCodeException({
        code: StorageErrorCode.DEFAULT_RESOURCE_NOT_FOUND_ERROR,
        status: 404,
      });
    }

    if (!file.exists()) {
      //try to load and return file data from file-upload-request
      if (event.file_uuid) {
        const fur: FileUploadRequest = await new FileUploadRequest(
          {},
          context,
        ).populateByUUID(event.file_uuid);

        if (fur.exists()) {
          //check if file uploaded to S3
          const s3Client: AWS_S3 = new AWS_S3();
          if (
            await s3Client.exists(
              env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
              fur.s3FileKey,
            )
          )
            fileStatus = FileStatus.UPLOADED_TO_S3;
          else fileStatus = FileStatus.REQUEST_FOR_UPLOAD_GENERATED;

          return {
            fileStatus: fileStatus,
            file: fur.serialize(SerializeFor.PROFILE),
            crustStatus: undefined,
          };
        }
      }

      throw new StorageCodeException({
        code: StorageErrorCode.FILE_DOES_NOT_EXISTS,
        status: 404,
      });
    }

    file.canAccess(context);
    fileStatus = FileStatus.UPLOADED_TO_IPFS;
    //File exists on IPFS and probably on CRUST- get status from CRUST
    let crustOrderStatus = undefined;
    if (file.CID) {
      crustOrderStatus = await CrustService.getOrderStatus({
        cid: file.CID,
      });
      fileStatus = FileStatus.PINNED_TO_CRUST;
    }

    return {
      fileStatus: fileStatus,
      file: file.serialize(SerializeFor.PROFILE),
      crustStatus: crustOrderStatus,
    };
  }
}
