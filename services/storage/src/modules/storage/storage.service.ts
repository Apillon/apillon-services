import {
  AWS_S3,
  CreateS3SignedUrlForUploadDto,
  env,
  SerializeFor,
} from '@apillon/lib';
import { CID } from 'ipfs-http-client';
import {
  BucketType,
  FileStatus,
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../../config/types';
import { ServiceContext } from '../../context';
import { StorageCodeException } from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { DirectoryService } from '../directory/directory.service';
import { Directory } from '../directory/models/directory.model';
import { IPFSService } from '../ipfs/ipfs.service';
import { FileUploadRequest } from './models/file-upload-request.model';
import { FileUploadSession } from './models/file-upload-session.model';
import { File } from './models/file.model';
import { v4 as uuidV4 } from 'uuid';
import { CrustService } from '../crust/crust.service';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';

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

    return { signedUrlForUpload: signedURLForUpload, file_uuid: fur.file_uuid };
  }

  static async endFileUploadSessionAndExecuteSyncToIPFS(
    event: { session_uuid: string; createDirectoryInIPFS: boolean },
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

    return true;

    //Get files in session (fileStatus must be ofst atus 1)
    const files = (
      await new FileUploadRequest(
        {},
        context,
      ).populateFileUploadRequestsInSession(session.id, context)
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
      const ipfsRes = await IPFSService.uploadFilesToIPFSFromS3({
        fileUploadRequests: files,
        wrapWithDirectory: true,
      });

      /*await CrustService.placeStorageOrderToCRUST({
          cid: ipfsRes.CID,
          size: ipfsRes.size,
        });*/

      //Clear bucket content - directories and files
      await bucket.clearBucketContent();

      //Create new directories & files
      const directories = [];
      for (const file of files.filter(
        (x) =>
          x.fileStatus ==
          FileUploadRequestFileStatus.SIGNED_URL_FOR_UPLOAD_GENERATED,
      )) {
        const fileDirectory = await StorageService.generateDirectoriesFromPath(
          context,
          directories,
          file,
          ipfsRes.ipfsDirectories,
        );

        //Create new file
        await new File({}, context)
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
          .insert();

        //now the file has CID, exists in IPFS node and is pinned to CRUST
        //update file-upload-request status
        file.fileStatus =
          FileUploadRequestFileStatus.UPLOADED_TO_IPFS_AND_CRUST;
        //await file.update();
      }

      //publish IPNS
      const ipns = await IPFSService.publishToIPNS(
        ipfsRes.parentDirCID.toV0().toString(),
        bucket.bucket_uuid,
      );

      //Update bucket CID & IPNS
      bucket.CID = ipfsRes.parentDirCID.toV0().toString();
      bucket.IPNS = ipns.name;
      await bucket.update();
    } else {
      //get directories in bucket
      const directories = await new Directory(
        {},
        context,
      ).populateDirectoriesInBucket(files[0].bucket_id, context);

      //loop through files to sync each one of it to IPFS
      for (const file of files) {
        let ipfsRes = undefined;
        try {
          ipfsRes = await IPFSService.uploadFileToIPFSFromS3(
            { fileKey: file.s3FileKey },
            context,
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
          } else throw err;
        }

        /*await CrustService.placeStorageOrderToCRUST({
          cid: ipfsRes.CID,
          size: ipfsRes.size,
        });*/

        const fileDirectory = await StorageService.generateDirectoriesFromPath(
          context,
          directories,
          file,
        );

        //check if file already exists
        const existingFile = await new File(
          {},
          context,
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
          await new File({}, context)
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
    }

    //update session status
    session.sessionStatus = 2;
    await session.update();

    return true;
  }

  static async generateDirectoriesFromPath(
    context: ServiceContext,
    directories: Directory[],
    fur: FileUploadRequest,
    ipfsDirectories?: { path: string; cid: CID }[],
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
            parentDirectory_id: currDirectory?.id,
            bucket_id: fur.bucket_id,
            name: splittedPath[i],
          });

          //search, if directory with that path, was created on IPFS
          const ipfsDirectory = ipfsDirectories.find(
            (x) => x.path == splittedPath.slice(0, i + 1).join('/'),
          );
          if (ipfsDirectory)
            newDirectory.CID = ipfsDirectory.cid.toV0().toString();

          currDirectory = await DirectoryService.createDirectory(
            {
              body: newDirectory,
            },
            context,
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
