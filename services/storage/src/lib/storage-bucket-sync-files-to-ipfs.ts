import {
  AWS_S3,
  env,
  Lmas,
  LogType,
  runWithWorkers,
  ServiceName,
  writeLog,
} from '@apillon/lib';
import {
  DbTables,
  FileStatus,
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { File } from '../modules/storage/models/file.model';
import {
  generateDirectoriesForFUR,
  generateDirectoriesForFURs,
  generateDirectoriesFromPath,
} from '../lib/generate-directories-from-path';
import { pinFileToCRUST } from './pin-file-to-crust';
import { getSessionFilesOnS3 } from './file-upload-session-s3-files';
import { CID } from 'ipfs-http-client';
import { uploadItemsToIPFSRes } from '../modules/ipfs/interfaces/upload-items-to-ipfs-res.interface';

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
  let wrappedDirCid: string = undefined;

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
    const filesOnS3 = await getSessionFilesOnS3(bucket, session);

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

    let ipfsRes: uploadItemsToIPFSRes = undefined;
    try {
      ipfsRes = await IPFSService.uploadFURsToIPFSFromS3(
        {
          fileUploadRequests: files,
          wrapWithDirectory: wrapWithDirectory,
          wrappingDirectoryPath,
          project_uuid: bucket.project_uuid,
        },
        context,
      );
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
      await new Lmas().sendAdminAlert(
        `[Storage]: Error uploading to IPFS!`,
        ServiceName.STORAGE,
        LogType.ALERT,
      );

      throw err;
    }

    //Update directories CIDs
    let wrappingDirectory: Directory;
    if (wrappingDirectoryPath) {
      wrappingDirectory = await generateDirectoriesFromPath(
        context,
        directories,
        wrappingDirectoryPath,
        bucket,
        ipfsRes.ipfsDirectories,
      );

      wrappingDirectory.CID = ipfsRes.parentDirCID.toV0().toString();
      wrappingDirectory.CIDv1 = ipfsRes.parentDirCID.toV1().toString();
      await wrappingDirectory.update();

      for (const fur of files) {
        fur.path = fur.path
          ? wrappingDirectoryPath + '/' + fur.path
          : wrappingDirectoryPath;
      }
    }

    for (const ipfsDir of ipfsRes.ipfsDirectories) {
      //Update directories with CID
      const dir = await generateDirectoriesFromPath(
        context,
        directories,
        wrappingDirectoryPath
          ? wrappingDirectoryPath + '/' + ipfsDir.path
          : ipfsDir.path,
        bucket,
      );
      if (dir.exists()) {
        dir.CID = ipfsDir.cid.toV0().toString();
        dir.CIDv1 = ipfsDir.cid.toV1().toString();
        await dir.update();
      }
    }

    //Update files CIDs
    for (const file of files.filter(
      (x) =>
        x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED &&
        x.fileStatus != FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3,
    )) {
      try {
        //check if file already exists
        const existingFile = await new File({}, context).populateByUUID(
          file.file_uuid,
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
          const fileDirectory = await generateDirectoriesForFUR(
            context,
            directories,
            file,
            bucket,
            ipfsRes.ipfsDirectories,
          );

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

      //delete file from s3
      await s3Client.remove(env.STORAGE_AWS_IPFS_QUEUE_BUCKET, file.s3FileKey);
    }

    tmpSize += ipfsRes.size;
    bucket.uploadedSize += ipfsRes.size;
    bucket.size = bucket.size ? bucket.size + ipfsRes.size : ipfsRes.size;

    await pinFileToCRUST(
      context,
      bucket.bucket_uuid,
      ipfsRes.parentDirCID,
      ipfsRes.size,
      true,
      wrappingDirectory.directory_uuid,
      DbTables.DIRECTORY,
    );
    wrappedDirCid = ipfsRes.parentDirCID.toV0().toString();
  } else {
    //Generate directories
    await generateDirectoriesForFURs(context, directories, files, bucket);
    //loop through files to sync each one of it to IPFS
    await runWithWorkers(
      files.filter(
        (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
      ),
      20,
      context,
      async (file) => {
        file = new FileUploadRequest(file, context);
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
          return;
        }

        let ipfsRes = undefined;
        try {
          ipfsRes = await IPFSService.uploadFURToIPFSFromS3(
            { fileUploadRequest: file, project_uuid: bucket.project_uuid },
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
            return;
          } else {
            file.fileStatus =
              FileUploadRequestFileStatus.ERROR_UPLOADING_TO_IPFS;
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

            await new Lmas().sendAdminAlert(
              `[Storage]: Error uploading to IPFS!`,
              ServiceName.STORAGE,
              LogType.ALERT,
            );
            throw err;
          }
        }

        try {
          //File should already exists - get by uuid
          const existingFile = await new File({}, context).populateByUUID(
            file.file_uuid,
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
            //Create new file - this should probably newer happen. But will leave for now.
            const fileDirectory = await generateDirectoriesForFUR(
              context,
              directories,
              file,
              bucket,
            );

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
        await s3Client.remove(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          file.s3FileKey,
        );

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
      },
    );

    writeLog(
      LogType.INFO,
      `Sending files to PinToCRUST worker... Num of files: `,
      'storage-bucket-sync-files-to-ipfsRes.ts',
      'storageBucketSyncFilesToIPFS',
    );

    await runWithWorkers(
      transferedFiles,
      20,
      context,
      async (transferedFile) => {
        await pinFileToCRUST(
          context,
          bucket.bucket_uuid,
          CID.parse(transferedFile.CID),
          transferedFile.size,
          false,
          transferedFile.file_uuid,
          DbTables.FILE,
        );
      },
    );
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

  return { files: transferedFiles, wrappedDirCid: wrappedDirCid };
}
