import { AWS_S3, CreateS3SignedUrlForUploadDto, env } from 'at-lib';
import { CID } from 'ipfs-http-client';
import {
  BucketType,
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

export class StorageService {
  static async generateS3SignedUrlForUpload(
    event: { body: CreateS3SignedUrlForUploadDto },
    context: ServiceContext,
  ): Promise<any> {
    //First create fileUploadSession & fileUploadRequest records in DB, then generate S3 signed url for upload
    let session: FileUploadSession = undefined;

    //Get existing or create new fileUploadSession
    session = await new FileUploadSession({}, context).populateByUUID(
      event.body.session_uuid,
    );

    if (!session.exists()) {
      //create new session
      session = new FileUploadSession(
        { session_uuid: event.body.session_uuid },
        context,
      );
      await session.insert();
    }

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

    const s3FileKey = `${bucket.id}/${session.session_uuid}/${
      (event.body.path ? event.body.path : '') + event.body.fileName
    }`;

    const fur: FileUploadRequest = new FileUploadRequest(
      event.body,
      context,
    ).populate({
      session_id: session?.id,
      bucket_id: bucket.id,
      s3FileKey: s3FileKey,
    });

    await fur.insert();

    const s3Client: AWS_S3 = new AWS_S3();
    const signedURLForUpload = await s3Client.generateSignedUploadURL(
      env.AT_STORAGE_AWS_IPFS_QUEUE_BUCKET,
      s3FileKey,
    );

    return { signedUrlForUpload: signedURLForUpload };
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

    //Get files in session (fileStatus must be of status 1)
    const files = (
      await new FileUploadRequest(
        {},
        context,
      ).populateFileUploadRequestsInSession(session.id, context)
    ).filter(
      (x) =>
        x.fileStatus ==
        FileUploadRequestFileStatus.SIGNED_URL_FOR_UPLOAD_GENERATED,
    );

    if (files.length == 0) {
      throw new StorageCodeException({
        code: StorageErrorCode.NO_FILES_FOR_TRANSFER_TO_IPFS,
        status: 404,
      });
    }

    //get bucket
    const bucket = await new Bucket({}, context).populateById(
      files[0].bucket_id,
    );

    if (bucket.bucketType == BucketType.HOSTING) {
      const ipfsRes = await IPFSService.uploadFilesToIPFSFromS3(
        {
          fileUploadRequests: files,
          wrapWithDirectory: true,
        },
        context,
      );

      /*await CrustService.placeStorageOrderToCRUST({
          cid: ipfsRes.CID,
          size: ipfsRes.size,
        });*/

      //Clear bucket content - directories and files
      await bucket.clearBucketContent();

      //Create new directories & files
      const directories = [];
      for (const file of files) {
        const fileDirectory = await StorageService.generateDirectoriesFromPath(
          context,
          directories,
          file,
          ipfsRes.ipfsDirectories,
        );

        //Create new file
        await new File({}, context)
          .populate({
            CID: file.CID.toV0().toString(),
            name: file.fileName,
            contentType: file.contentType,
            bucket_id: file.bucket_id,
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
      bucket.IPNS = ipns.value;
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
            name: file.fileName,
            contentType: file.contentType,
            size: ipfsRes.size,
          });

          await existingFile.update();
        } else {
          //Create new file
          await new File({}, context)
            .populate({
              CID: ipfsRes.cidV0,
              name: file.fileName,
              contentType: file.contentType,
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
}
