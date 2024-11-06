import {
  AWS_S3,
  CacheKeyPrefix,
  CodeException,
  env,
  invalidateCacheMatch,
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
import {
  generateDirectoriesForFUR,
  generateDirectoriesForFURs,
  generateDirectoriesFromPath,
} from '../lib/generate-directories-from-path';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { uploadItemsToIPFSRes } from '../modules/ipfs/interfaces/upload-items-to-ipfs-res.interface';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { File } from '../modules/storage/models/file.model';
import { pinFileToCRUST } from './pin-file-to-crust';
import { StorageCodeException } from './exceptions';

/**
 * Transfers file from s3 to IPFS & CRUST
 * @returns
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function storageBucketSyncFilesToIPFS(
  context,
  location,
  bucket: Bucket,
  files: FileUploadRequest[],
  wrapWithDirectory: boolean,
  wrappingDirectoryPath: string,
) {
  const transferredFiles: File[] = [];
  let wrappedDirCid: string = undefined;

  //get directories in bucket
  const directories = await new Directory(
    {},
    context,
  ).populateDirectoriesInBucket(bucket.id, context);

  //size of files, that were pushed to ipfs
  let tmpSize = 0;

  if (wrapWithDirectory) {
    //This means, that files, that were uploaded to S3, within session, will be added to parent CID.
    //In this CID, files will have structure, that was defined with path variable in file-upload-request.

    const s3Client: AWS_S3 = new AWS_S3();

    /*Each IPFS node has it's own MFS. 
      In this case, MFS writes must be performed to master node, that's why ipfs service shouldn't use backup node here.*/
    const ipfsService = new IPFSService(context, bucket.project_uuid);

    let ipfsRes: uploadItemsToIPFSRes = undefined;
    try {
      ipfsRes = await ipfsService.uploadFURsToIPFSFromS3(
        {
          fileUploadRequests: files,
          wrappingDirectoryPath,
        },
        context,
      );
    } catch (err) {
      console.error(
        `Error at ipfsService.uploadFURsToIPFSFromS3. Is instance of StorageCodeException: ${err instanceof StorageCodeException}`,
        err,
      );
      if (err instanceof StorageCodeException) {
        throw err;
      }

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

      wrappingDirectory.CID = ipfsRes.parentDirCID;
      wrappingDirectory.CIDv1 = ipfsRes.parentDirCID;
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
        dir.CID = ipfsDir.cid;
        dir.CIDv1 = ipfsDir.cid;
        await dir.update();
      }
    }

    //Update files CIDs
    await runWithWorkers(
      files.filter(
        (x) =>
          x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED &&
          x.fileStatus !=
            FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3,
      ),
      20,
      context,
      async (file: FileUploadRequest) => {
        file = new FileUploadRequest(file, context);
        try {
          //check if file already exists
          const existingFile = await new File({}, context).populateAllByUUID(
            file.file_uuid,
          );

          if (existingFile.exists()) {
            //Update existing file
            existingFile.populate({
              CID: file.CID,
              CIDv1: file.CID,
              s3FileKey: file.s3FileKey,
              name: file.fileName,
              contentType: file.contentType,
              size: file.size,
              fileStatus: FileStatus.UPLOADED_TO_IPFS,
            });

            await existingFile.update();
            transferredFiles.push(existingFile);
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
                CID: file.CID,
                CIDv1: file.CID,
                s3FileKey: file.s3FileKey,
                name: file.fileName,
                contentType: file.contentType,
                project_uuid: bucket.project_uuid,
                bucket_id: file.bucket_id,
                path: file.path,
                directory_id: fileDirectory?.id,
                size: file.size,
                fileStatus: FileStatus.UPLOADED_TO_IPFS,
              })
              .insert();

            transferredFiles.push(tmpF);
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
        await s3Client.remove(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          file.s3FileKey,
        );
      },
    );

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
    wrappedDirCid = ipfsRes.parentDirCID;
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

        let ipfsRes = undefined;
        try {
          ipfsRes = await new IPFSService(
            context,
            bucket.project_uuid,
            true,
          ).uploadFURToIPFSFromS3(
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
          const existingFile = await new File({}, context).populateAllByUUID(
            file.file_uuid,
          );

          if (existingFile.exists()) {
            //Update existing file
            existingFile.populate({
              CID: ipfsRes.cidV0,
              CIDv1: ipfsRes.cidV1,
              s3FileKey: file.s3FileKey,
              name: file.fileName,
              contentType: file.contentType,
              size: ipfsRes.size,
              fileStatus: FileStatus.UPLOADED_TO_IPFS,
            });

            await existingFile.update();
            transferredFiles.push(existingFile);
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
                CIDv1: ipfsRes.cidV1,
                s3FileKey: file.s3FileKey,
                name: file.fileName,
                contentType: file.contentType,
                project_uuid: bucket.project_uuid,
                bucket_id: file.bucket_id,
                directory_id: fileDirectory?.id,
                path: file.path,
                size: ipfsRes.size,
                fileStatus: FileStatus.UPLOADED_TO_IPFS,
              })
              .insert();

            transferredFiles.push(tmpF);
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
      },
    );

    writeLog(
      LogType.INFO,
      `Sending files to PinToCRUST worker... Num of files: `,
      'storage-bucket-sync-files-to-ipfsRes.ts',
      'storageBucketSyncFilesToIPFS',
    );

    await runWithWorkers(
      transferredFiles,
      20,
      context,
      async (transferredFile) => {
        await pinFileToCRUST(
          context,
          bucket.bucket_uuid,
          transferredFile.CID,
          transferredFile.size,
          false,
          transferredFile.file_uuid,
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

  //increase used bandwidth
  const currDate = new Date();
  try {
    await new IPFSService(context, bucket.project_uuid).increaseUsedBandwidth(
      currDate.getMonth() + 1,
      currDate.getFullYear(),
      tmpSize,
    );
  } catch (err) {
    await new CodeException({
      context,
      code: StorageErrorCode.ERROR_INCREASING_USED_BANDWIDTH,
      status: 500,
      sourceFunction: 'storageBucketSyncFilesToIPFS',
    }).writeToMonitor({
      project_uuid: bucket.project_uuid,
      data: {
        month: currDate.getMonth(),
        year: currDate.getFullYear(),
        bytes: tmpSize,
      },
    });
  }

  writeLog(
    LogType.INFO,
    `storageBucketSyncFilesToIPFS completed! `,
    'storage-bucket-sync-files-to-ipfsRes.ts',
    'storageBucketSyncFilesToIPFS',
  );

  await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
    project_uuid: bucket.project_uuid,
  });

  return { files: transferredFiles, wrappedDirCid: wrappedDirCid };
}
