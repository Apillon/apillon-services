import {
  Context,
  env,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
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
import { Bucket } from '../modules/bucket/models/bucket.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { StorageService } from '../modules/storage/storage.service';
import { File } from '../modules/storage/models/file.model';
import { Directory } from '../modules/directory/models/directory.model';
import { CrustService } from '../modules/crust/crust.service';

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
    const session_uuid = data?.session_uuid;

    //Get session
    const session = await new FileUploadSession(
      {},
      this.context,
    ).populateByUUID(session_uuid);

    if (!session.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
        status: 404,
      });
    }

    //get bucket
    const bucket = await new Bucket({}, this.context).populateById(
      session.bucket_id,
    );

    //Get files in session (fileStatus must be of status 1)
    const files = (
      await new FileUploadRequest(
        {},
        this.context,
      ).populateFileUploadRequestsInSession(session.id, this.context)
    ).filter(
      (x) =>
        x.fileStatus != FileUploadRequestFileStatus.UPLOADED_TO_IPFS_AND_CRUST,
    );

    if (files.length == 0) {
      throw new StorageCodeException({
        code: StorageErrorCode.NO_FILES_FOR_TRANSFER_TO_IPFS,
        status: 404,
      });
    }

    if (bucket.bucketType == BucketType.HOSTING) {
      let ipfsRes = undefined;
      try {
        ipfsRes = await IPFSService.uploadFilesToIPFSFromS3({
          fileUploadRequests: files,
          wrapWithDirectory: true,
        });
      } catch (err) {
        await new Lmas().writeLog({
          context: this.context,
          project_uuid: bucket.project_uuid,
          logType: LogType.ERROR,
          message: 'Error uploading files to IPFS',
          location: `${this.constructor.name}/runExecutor`,
          service: ServiceName.STORAGE,
          data: {
            session: session.serialize(),
            files: files.map((x) => x.serialize()),
          },
        });
        throw err;
      }

      try {
        await CrustService.placeStorageOrderToCRUST({
          cid: ipfsRes.parentDirCID,
          size: ipfsRes.size,
        });
        await new Lmas().writeLog({
          context: this.context,
          project_uuid: bucket.project_uuid,
          logType: LogType.COST,
          message: 'Success placing storage order to CRUST',
          location: `${this.constructor.name}/runExecutor`,
          service: ServiceName.STORAGE,
        });
      } catch (err) {
        await new Lmas().writeLog({
          context: this.context,
          project_uuid: bucket.project_uuid,
          logType: LogType.ERROR,
          message: 'Error at placing storage order to CRUST',
          location: `${this.constructor.name}/runExecutor`,
          service: ServiceName.STORAGE,
        });
        throw err;
      }

      const conn = await this.context.mysql.start();

      try {
        //Clear bucket content - directories and files
        await bucket.clearBucketContent(this.context, conn);

        //Create new directories & files
        const directories = [];
        for (const file of files.filter(
          (x) =>
            x.fileStatus ==
            FileUploadRequestFileStatus.SIGNED_URL_FOR_UPLOAD_GENERATED,
        )) {
          const fileDirectory =
            await StorageService.generateDirectoriesFromPath(
              this.context,
              directories,
              file,
              bucket,
              ipfsRes.ipfsDirectories,
              conn,
            );

          //Create new file
          await new File({}, this.context)
            .populate({
              file_uuid: file.file_uuid,
              CID: file.CID.toV0().toString(),
              s3FileKey: file.s3FileKey,
              name: file.fileName,
              contentType: file.contentType,
              bucket_id: file.bucket_id,
              project_uuid: bucket.project_uuid,
              directory_id: fileDirectory?.id,
              size: file.size,
            })
            .insert(SerializeFor.INSERT_DB, conn);

          //now the file has CID, exists in IPFS node and is pinned to CRUST
          //update file-upload-request status
          file.fileStatus =
            FileUploadRequestFileStatus.UPLOADED_TO_IPFS_AND_CRUST;
          await file.update(SerializeFor.UPDATE_DB, conn);
        }

        //publish IPNS
        const ipns = await IPFSService.publishToIPNS(
          ipfsRes.parentDirCID.toV0().toString(),
          bucket.bucket_uuid,
        );

        //Update bucket CID & IPNS & Size
        bucket.CID = ipfsRes.parentDirCID.toV0().toString();
        bucket.IPNS = ipns.name;
        bucket.size = bucket.size ? bucket.size + ipfsRes.size : ipfsRes.size;
        await bucket.update(SerializeFor.UPDATE_DB, conn);

        await this.context.mysql.commit(conn);

        await new Lmas().writeLog({
          context: this.context,
          project_uuid: bucket.project_uuid,
          logType: LogType.INFO,
          message: 'Hosting bucket content changed',
          location: `${this.constructor.name}/runExecutor`,
          service: ServiceName.STORAGE,
          data: {
            bucket_uuid: bucket.bucket_uuid,
            bucketSize: bucket.size,
          },
        });
      } catch (err) {
        await this.context.mysql.rollback(conn);
        throw err;
      }
    } else {
      //get directories in bucket
      const directories = await new Directory(
        {},
        this.context,
      ).populateDirectoriesInBucket(files[0].bucket_id, this.context);

      //size of files, that were pushed to ipfs
      let tmpSize = 0;

      //loop through files to sync each one of it to IPFS
      for (const file of files) {
        let ipfsRes = undefined;
        try {
          ipfsRes = await IPFSService.uploadFileToIPFSFromS3(
            { fileKey: file.s3FileKey },
            this.context,
          );
        } catch (err) {
          if (
            err?.options?.code ==
            StorageErrorCode.FILE_DOES_NOT_EXISTS_IN_BUCKET
          ) {
            file.fileStatus =
              FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3;
            await file.update();
            continue;
          } else {
            await new Lmas().writeLog({
              context: this.context,
              project_uuid: bucket.project_uuid,
              logType: LogType.ERROR,
              message: 'Error uploading file to IPFS',
              location: `${this.constructor.name}/runExecutor`,
              service: ServiceName.STORAGE,
              data: {
                session: session.serialize(),
                file: file.serialize(),
              },
            });
            throw err;
          }
        }

        tmpSize += ipfsRes.size;

        try {
          await CrustService.placeStorageOrderToCRUST({
            cid: ipfsRes.CID,
            size: ipfsRes.size,
          });
          await new Lmas().writeLog({
            context: this.context,
            project_uuid: bucket.project_uuid,
            logType: LogType.COST,
            message: 'Success placing storage order to CRUST',
            location: `${this.constructor.name}/runExecutor`,
            service: ServiceName.STORAGE,
          });
        } catch (err) {
          await new Lmas().writeLog({
            context: this.context,
            project_uuid: bucket.project_uuid,
            logType: LogType.ERROR,
            message: 'Error at placing storage order to CRUST',
            location: `${this.constructor.name}/runExecutor`,
            service: ServiceName.STORAGE,
          });
          throw err;
        }

        const fileDirectory = await StorageService.generateDirectoriesFromPath(
          this.context,
          directories,
          file,
          bucket,
        );

        //check if file already exists
        const existingFile = await new File(
          {},
          this.context,
        ).populateByNameAndDirectory(file.fileName, fileDirectory?.id);

        if (existingFile.exists()) {
          //Update existing file
          existingFile.populate({
            CID: ipfsRes.cidV0,
            s3FileKey: file.s3FileKey,
            name: file.fileName,
            contentType: file.contentType,
            size: ipfsRes.size,
          });

          await existingFile.update();
        } else {
          //Create new file
          await new File({}, this.context)
            .populate({
              file_uuid: file.file_uuid,
              CID: ipfsRes.cidV0,
              s3FileKey: file.s3FileKey,
              name: file.fileName,
              contentType: file.contentType,
              project_uuid: bucket.project_uuid,
              bucket_id: file.bucket_id,
              directory_id: fileDirectory?.id,
              size: ipfsRes.size,
            })
            .insert();
        }

        //now the file has CID, exists in IPFS node and is pinned to CRUST
        //update file-upload-request status
        file.fileStatus =
          FileUploadRequestFileStatus.UPLOADED_TO_IPFS_AND_CRUST;
        await file.update();
      }

      //update bucket size
      bucket.size = bucket.size ? bucket.size + tmpSize : tmpSize;
      await bucket.update();

      await new Lmas().writeLog({
        context: this.context,
        project_uuid: bucket.project_uuid,
        logType: LogType.INFO,
        message: 'Storage bucket size increased',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.STORAGE,
        data: {
          bucket_uuid: bucket.bucket_uuid,
          size: tmpSize,
          bucketSize: bucket.size,
        },
      });
    }

    //update session status
    session.sessionStatus = 2;
    await session.update();

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `SyncToIPFS worker for session: ${session_uuid} has been completed!`,
    );

    return true;
  }
}
