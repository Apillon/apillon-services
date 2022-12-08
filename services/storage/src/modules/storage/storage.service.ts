import {
  AppEnvironment,
  AWS_S3,
  CreateS3SignedUrlForUploadDto,
  EndFileUploadSessionDto,
  env,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import { FileStatus, StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { StorageCodeException } from '../../lib/exceptions';
import { SyncToIPFSWorker } from '../../workers/s3-to-ipfs-sync-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
import { CrustService } from '../crust/crust.service';
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

    let signedURLForUpload = undefined;
    try {
      const s3Client: AWS_S3 = new AWS_S3();
      signedURLForUpload = await s3Client.generateSignedUploadURL(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        s3FileKey,
      );
    } catch (err) {
      throw await new StorageCodeException({
        code: StorageErrorCode.ERROR_AT_GENERATE_S3_SIGNED_URL,
        status: 500,
      }).writeToMonitor({
        context,
        project_uuid: bucket.project_uuid,
        service: ServiceName.STORAGE,
        data: {
          fileUploadRequest: fur,
        },
      });
    }

    await new Lmas().writeLog({
      context: context,
      project_uuid: bucket.project_uuid,
      logType: LogType.INFO,
      message: 'Generate file-request-log and S3 signed url - success',
      location: `${this.constructor.name}/runExecutor`,
      service: ServiceName.STORAGE,
    });

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

  static async getFileDetails(
    event: { CIDOrUUID: string },
    context: ServiceContext,
  ) {
    let file: File = undefined;
    let fileStatus: FileStatus = undefined;
    if (event.CIDOrUUID)
      file = await new File({}, context).populateByCIDorUUID(event.CIDOrUUID);
    else {
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
      ).populateByUUID(event.CIDOrUUID);

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
      file.downloadLink = env.STORAGE_IPFS_PROVIDER + file.CID;
    }

    return {
      fileStatus: fileStatus,
      file: file.serialize(SerializeFor.PROFILE),
      crustStatus: crustOrderStatus,
    };
  }

  static async deleteFile(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const f: File = await new File({}, context).populateById(event.id);

    if (!f.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_FOUND,
        status: 404,
      });
    }
    f.canModify(context);

    await f.markDeleted();

    //Also delete file-upload-request
    const fur: FileUploadRequest = await new FileUploadRequest(
      {},
      context,
    ).populateByUUID(f.file_uuid);

    if (fur.exists()) {
      await fur.markDeleted();
    }

    //TODO: We should probably delete file from our IPFS node.
    //But for now, this will be OK, because http-ipfs-client doesn't have method for delete

    return f.serialize(SerializeFor.PROFILE);
  }
}
