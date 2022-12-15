import { AWS_S3, env, Lmas, LogType, ServiceName } from '@apillon/lib';
import { FileUploadRequestFileStatus, StorageErrorCode } from '../config/types';
import { CrustService } from '../modules/crust/crust.service';
import { Directory } from '../modules/directory/models/directory.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { File } from '../modules/storage/models/file.model';
import { generateDirectoriesForFUR } from '../utils/generate-directories-from-path';

/**
 * Transfers file from s3 to IPFS & CRUST
 * @param bucket STORAGE bucket
 * @param maxBucketSize
 * @param files
 * @returns
 */
export async function storageBucketSyncFilesToIPFS(
  context,
  location,
  bucket,
  maxBucketSize,
  files: any[],
) {
  const transferedFiles = [];

  //get directories in bucket
  const directories = await new Directory(
    {},
    context,
  ).populateDirectoriesInBucket(files[0].bucket_id, context);

  //size of files, that were pushed to ipfs
  let tmpSize = 0;

  //loop through files to sync each one of it to IPFS
  for (const file of files.filter(
    (x) => x.fileStatus != FileUploadRequestFileStatus.PINNED_TO_CRUST,
  )) {
    if (bucket.size >= maxBucketSize) {
      //max size was reached - mark files that will not be transfered to IPFS
      file.fileStatus = FileUploadRequestFileStatus.ERROR_BUCKET_FULL;
      await file.update();
      //delete file from s3
      const s3Client: AWS_S3 = new AWS_S3();
      await s3Client.remove(env.STORAGE_AWS_IPFS_QUEUE_BUCKET, file.s3FileKey);
    }

    let ipfsRes = undefined;
    try {
      ipfsRes = await IPFSService.uploadFileToIPFSFromS3(
        { fileKey: file.s3FileKey },
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
          },
        });
        throw err;
      }
    }

    try {
      await CrustService.placeStorageOrderToCRUST({
        cid: ipfsRes.CID,
        size: ipfsRes.size,
      });
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.COST,
        message: 'Success placing storage order to CRUST',
        location: location,
        service: ServiceName.STORAGE,
      });

      file.fileStatus = FileUploadRequestFileStatus.PINNED_TO_CRUST;
      await file.update();
    } catch (err) {
      file.fileStatus = FileUploadRequestFileStatus.ERROR_PINING_TO_CRUST;
      await file.update();

      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.ERROR,
        message: 'Error at placing storage order to CRUST',
        location: location,
        service: ServiceName.STORAGE,
      });
      throw err;
    }

    const fileDirectory = await generateDirectoriesForFUR(
      context,
      directories,
      file,
      bucket,
    );

    //check if file already exists
    const existingFile = await new File({}, context).populateByNameAndDirectory(
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
        })
        .insert();

      transferedFiles.push(tmpF);
    }

    //now the file has CID, exists in IPFS node and is pinned to CRUST
    //update file-upload-request status
    file.fileStatus = FileUploadRequestFileStatus.UPLOAD_COMPLETED;
    await file.update();

    tmpSize += ipfsRes.size;
    bucket.size = bucket.size ? bucket.size + ipfsRes.size : ipfsRes.size;

    //delete file from s3
    const s3Client: AWS_S3 = new AWS_S3();
    await s3Client.remove(env.STORAGE_AWS_IPFS_QUEUE_BUCKET, file.s3FileKey);

    //Check if bucket max size reached. Write message to monitoring - all following files will not be transfered to IPFS. Their status will update to error and they will be deleted from S3.
    if (bucket.size >= maxBucketSize) {
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.INFO,
        message: 'MAX Storage bucket size reqched',
        location: location,
        service: ServiceName.STORAGE,
        data: {
          bucket_uuid: bucket.bucket_uuid,
          bucketSize: bucket.size,
        },
      });
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
    },
  });

  return transferedFiles;
}
