import { AWS_S3, CreateS3SignedUrlForUploadDto, env } from 'at-lib';
import {
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../../config/types';
import { ServiceContext } from '../../context';
import { StorageCodeException } from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { CrustService } from '../crust/crust.service';
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
      await session.create();
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
      (event.body.path ? event.body.path + '/' : '') + event.body.fileName
    }`;

    const fur: FileUploadRequest = new FileUploadRequest(
      event.body,
      context,
    ).populate({
      session_id: session?.id,
      bucket_id: bucket.id,
      s3FileKey: s3FileKey,
    });

    await fur.create();

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

    //get directories & files in bucket
    const directories = await new Directory(
      {},
      context,
    ).populateDirectoriesInBucket(files[0].bucket_id, context);

    if (!event.createDirectoryInIPFS) {
      //loop through files to sync each one of it to IPFS
      for (const file of files) {
        let ipfsRes = undefined;
        try {
          ipfsRes = await IPFSService.uploadFilesToIPFSFromS3(
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

        let currDirectory = undefined;
        //create or update directory & file in microservice database
        if (file.path) {
          const splittedPath: string[] = file.path.split('/');

          //Get or create directory
          for (let i = 0; i < splittedPath.length; i++) {
            const currChildDirectories =
              i == 0
                ? directories.filter((x) => x.parentDirectory_id == undefined)
                : directories.filter(
                    (x) => x.parentDirectory_id == currDirectory.id,
                  );

            currDirectory = currChildDirectories.find(
              (x) => x.name == splittedPath[i],
            );

            if (!currDirectory) {
              //create new directory
              const newDirectory: Directory = new Directory(
                {},
                context,
              ).populate({
                parentDirectory_id: currDirectory?.id,
                bucket_id: file.bucket_id,
                name: splittedPath[i],
              });

              currDirectory = await DirectoryService.createDirectory(
                {
                  body: newDirectory,
                },
                context,
              );
              //Add new directory to list of all directories
              directories.push(currDirectory);
            }
          }
        }

        //check if file already exists
        const existingFile = await new File(
          {},
          context,
        ).populateByNameAndDirectory(file.fileName, currDirectory?.id);

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
              directory_id: currDirectory?.id,
              size: ipfsRes.size,
            })
            .create();
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
}
