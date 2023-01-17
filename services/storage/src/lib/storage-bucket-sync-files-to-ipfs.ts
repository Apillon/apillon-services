import {
  AWS_S3,
  env,
  Lmas,
  LogType,
  ServiceName,
  writeLog,
} from '@apillon/lib';
import {
  FileStatus,
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { uploadFilesToIPFSRes } from '../modules/ipfs/interfaces/upload-files-to-ipfs-res.interface';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { File } from '../modules/storage/models/file.model';
import {
  generateDirectoriesForFUR,
  generateDirectoriesFromPath,
} from '../lib/generate-directories-from-path';
import { pinFileToCRUST } from './pin-file-to-crust';
import { getSizeOfFilesInSessionOnS3 } from './size-of-files';

/**
 * Transfers file from s3 to IPFS & CRUST
 * @param bucket STORAGE bucket
 * @param maxBucketSize
 * @param files
 * @returns
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function storageBucketSyncFilesToIPFS(
  context,
  location,
  bucket: Bucket,
  maxBucketSize,
  files: FileUploadRequest[],
  session: FileUploadSession,
  wrapWithDirectory: boolean,
  wrappingDirectoryPath: string,
) {
  const transferedFiles: File[] = [];

  //get directories in bucket
  const directories = await new Directory(
    {},
    context,
  ).populateDirectoriesInBucket(files[0].bucket_id, context);

  //size of files, that were pushed to ipfs
  let tmpSize = 0;

  if (wrapWithDirectory) {
    //This means, that files, that were uploaded to S3, within session, will be added to parent CID.
    //In this CID, files will have structure, that was defined with path variable in file-upload-request.

    //Check if size of files is greater than allowed bucket size.
    const s3Client: AWS_S3 = new AWS_S3();
    const filesOnS3 = await getSizeOfFilesInSessionOnS3(bucket, session);

    if (filesOnS3.size + bucket.size > maxBucketSize) {
      //Update all file upload requests with max bucket size reached error status
      for (const fur of files) {
        fur.fileStatus = FileUploadRequestFileStatus.ERROR_BUCKET_FULL;
        await fur.update();
      }

      //TODO - define flow. What happens in that case
      throw new StorageCodeException({
        code: StorageErrorCode.NOT_ENOUGH_SPACE_IN_BUCKET,
        status: 400,
      });
    }

    let ipfsRes: uploadFilesToIPFSRes = undefined;
    try {
      ipfsRes = await IPFSService.uploadFilesToIPFSFromS3({
        fileUploadRequests: files,
        wrapWithDirectory: wrapWithDirectory,
      });
    } catch (err) {
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.ERROR,
        message: 'Error uploading files to IPFS',
        location: location,
        service: ServiceName.STORAGE,
        data: {
          files: files.map((x) => x.serialize()),
          error: err,
        },
      });
      throw err;
    }

    let wrappingDirectory: Directory;
    if (wrappingDirectoryPath) {
      wrappingDirectory = await generateDirectoriesFromPath(
        context,
        directories,
        wrappingDirectoryPath,
        bucket,
        ipfsRes.ipfsDirectories,
      );
    }

    for (const file of files.filter(
      (x) =>
        x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED &&
        x.fileStatus != FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3,
    )) {
      try {
        if (wrappingDirectoryPath) {
          file.path = file.path
            ? wrappingDirectoryPath + '/' + file.path
            : wrappingDirectoryPath;
        }

        const fileDirectory = await generateDirectoriesForFUR(
          context,
          directories,
          file,
          bucket,
          ipfsRes.ipfsDirectories,
        );

        //check if file already exists
        const existingFile = await new File(
          {},
          context,
        ).populateByNameAndDirectory(
          bucket.id,
          file.fileName,
          fileDirectory?.id,
        );

        if (existingFile.exists()) {
          //Update existing file
          existingFile.populate({
            CID: file.CID.toV0().toString(),
            s3FileKey: file.s3FileKey,
            name: file.fileName,
            contentType: file.contentType,
            size: file.size,
            fileStatus: FileStatus.UPLOADED_TO_IPFS,
          });

          await existingFile.update();
          transferedFiles.push(existingFile);
        } else {
          //Create new file
          const tmpF = await new File({}, context)
            .populate({
              file_uuid: file.file_uuid,
              CID: file.CID.toV0().toString(),
              s3FileKey: file.s3FileKey,
              name: file.fileName,
              contentType: file.contentType,
              project_uuid: bucket.project_uuid,
              bucket_id: file.bucket_id,
              directory_id: fileDirectory?.id,
              size: file.size,
              fileStatus: FileStatus.UPLOADED_TO_IPFS,
            })
            .insert();

          transferedFiles.push(tmpF);
        }
      } catch (err) {
        await new Lmas().writeLog({
          context: context,
          project_uuid: bucket.project_uuid,
          logType: LogType.ERROR,
          message: 'Error creating directory or file',
          location: location,
          service: ServiceName.STORAGE,
          data: {
            file: file.serialize(),
            error: err,
          },
        });
        try {
          file.fileStatus =
            FileUploadRequestFileStatus.ERROR_CREATING_FILE_OBJECT;
          await file.update();
        } catch (err2) {
          writeLog(
            LogType.ERROR,
            'Error updating fileUploadRequest status to ERROR_CREATING_FILE_OBJECT',
            'storage-bucket-sync-files-to-ipfsRes.ts',
            'storageBucketSyncFilesToIPFS',
            err2,
          );
        }

        throw err;
      }

      //now the file has CID, exists in IPFS node and in bucket
      //update file-upload-request status
      file.fileStatus = FileUploadRequestFileStatus.UPLOAD_COMPLETED;
      await file.update();

      tmpSize += ipfsRes.size;
      bucket.uploadedSize += ipfsRes.size;
      bucket.size = bucket.size ? bucket.size + ipfsRes.size : ipfsRes.size;

      //delete file from s3
      await s3Client.remove(env.STORAGE_AWS_IPFS_QUEUE_BUCKET, file.s3FileKey);
    }

    //Update wrapping directory CID
    wrappingDirectory.CID = ipfsRes.parentDirCID.toV0().toString();
    await wrappingDirectory.update();

    await pinFileToCRUST(
      context,
      bucket.bucket_uuid,
      ipfsRes.parentDirCID,
      ipfsRes.size,
    );
  } else {
    //loop through files to sync each one of it to IPFS
    for (const file of files.filter(
      (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
    )) {
      if (bucket.size >= maxBucketSize) {
        //max size was reached - mark files that will not be transfered to IPFS
        file.fileStatus = FileUploadRequestFileStatus.ERROR_BUCKET_FULL;
        await file.update();
        //delete file from s3
        const s3Client: AWS_S3 = new AWS_S3();
        await s3Client.remove(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          file.s3FileKey,
        );
        continue;
      }

      let ipfsRes = undefined;
      try {
        ipfsRes = await IPFSService.uploadFileToIPFSFromS3(
          { fileUploadRequest: file },
          context,
        );
      } catch (err) {
        if (
          err?.options?.code == StorageErrorCode.FILE_DOES_NOT_EXISTS_IN_BUCKET
        ) {
          file.fileStatus =
            FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3;
          await file.update();
          continue;
        } else {
          file.fileStatus = FileUploadRequestFileStatus.ERROR_UPLOADING_TO_IPFS;
          await file.update();

          await new Lmas().writeLog({
            context: context,
            project_uuid: bucket.project_uuid,
            logType: LogType.ERROR,
            message: 'Error uploading file to IPFS',
            location: location,
            service: ServiceName.STORAGE,
            data: {
              file: file.serialize(),
              error: err,
            },
          });
          throw err;
        }
      }

      try {
        const fileDirectory = await generateDirectoriesForFUR(
          context,
          directories,
          file,
          bucket,
        );

        //check if file already exists
        const existingFile = await new File(
          {},
          context,
        ).populateByNameAndDirectory(
          bucket.id,
          file.fileName,
          fileDirectory?.id,
        );

        if (existingFile.exists()) {
          //Update existing file
          existingFile.populate({
            CID: ipfsRes.cidV0,
            s3FileKey: file.s3FileKey,
            name: file.fileName,
            contentType: file.contentType,
            size: ipfsRes.size,
            fileStatus: FileStatus.UPLOADED_TO_IPFS,
          });

          await existingFile.update();
          transferedFiles.push(existingFile);
        } else {
          //Create new file
          const tmpF = await new File({}, context)
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
              fileStatus: FileStatus.UPLOADED_TO_IPFS,
            })
            .insert();

          transferedFiles.push(tmpF);
        }
      } catch (err) {
        await new Lmas().writeLog({
          context: context,
          project_uuid: bucket.project_uuid,
          logType: LogType.ERROR,
          message: 'Error creating directory or file',
          location: location,
          service: ServiceName.STORAGE,
          data: {
            file: file.serialize(),
            error: err,
          },
        });

        try {
          file.fileStatus =
            FileUploadRequestFileStatus.ERROR_CREATING_FILE_OBJECT;
          await file.update();
        } catch (err2) {
          writeLog(
            LogType.ERROR,
            'Error updating fileUploadRequest status to ERROR_CREATING_FILE_OBJECT',
            'storage-bucket-sync-files-to-ipfsRes.ts',
            'storageBucketSyncFilesToIPFS',
            err2,
          );
        }

        throw err;
      }

      //now the file has CID, exists in IPFS node and in bucket
      //update file-upload-request status
      file.fileStatus = FileUploadRequestFileStatus.UPLOAD_COMPLETED;
      await file.update();

      tmpSize += ipfsRes.size;
      bucket.uploadedSize += ipfsRes.size;
      bucket.size = bucket.size ? bucket.size + ipfsRes.size : ipfsRes.size;

      //delete file from s3
      const s3Client: AWS_S3 = new AWS_S3();
      await s3Client.remove(env.STORAGE_AWS_IPFS_QUEUE_BUCKET, file.s3FileKey);

      //Check if bucket max size reached. Write message to monitoring -
      //all following files will not be transfered to IPFS. Their status will update to error and they will be deleted from S3.
      if (bucket.size >= maxBucketSize) {
        await new Lmas().writeLog({
          context: context,
          project_uuid: bucket.project_uuid,
          logType: LogType.INFO,
          message: 'MAX Storage bucket size reached',
          location: location,
          service: ServiceName.STORAGE,
          data: {
            bucket_uuid: bucket.bucket_uuid,
            bucketSize: bucket.size,
            bucketUploadedSize: bucket.uploadedSize,
          },
        });
      }
    }

    writeLog(
      LogType.INFO,
      `Sending files to PinToCRUST worker... Num of files: `,
      'storage-bucket-sync-files-to-ipfsRes.ts',
      'storageBucketSyncFilesToIPFS',
    );
    try {
      for (const transferedFile of transferedFiles) {
        await pinFileToCRUST(
          context,
          bucket.bucket_uuid,
          transferedFile.CID,
          transferedFile.size,
        );
      }
    } catch (err) {
      writeLog(
        LogType.ERROR,
        `Error sending files to PinToCRUST worker. `,
        'storage-bucket-sync-files-to-ipfsRes.ts',
        'storageBucketSyncFilesToIPFS',
        err,
      );
    }
  }

  //update bucket size
  await bucket.update();

  await new Lmas().writeLog({
    context: context,
    project_uuid: bucket.project_uuid,
    logType: LogType.INFO,
    message: 'Storage bucket size increased',
    location: location,
    service: ServiceName.STORAGE,
    data: {
      bucket_uuid: bucket.bucket_uuid,
      size: tmpSize,
      bucketSize: bucket.size,
      totalUploadedToBucket: bucket.uploadedSize,
    },
  });

  writeLog(
    LogType.INFO,
    `storageBucketSyncFilesToIPFS completed! `,
    'storage-bucket-sync-files-to-ipfsRes.ts',
    'storageBucketSyncFilesToIPFS',
  );

  return transferedFiles;
}