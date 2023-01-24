import {
  AWS_S3,
  env,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
import {
  FileStatus,
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { File } from '../modules/storage/models/file.model';
import { generateDirectoriesForFUR } from './generate-directories-from-path';
import { pinFileToCRUST } from './pin-file-to-crust';
import { getSessionFilesOnS3 } from './file-upload-session-s3-files';

/**
 * Transfers files from s3 to IPFS & pins them to CRUST
 * @param bucket HOSTING BUCKET
 * @param maxBucketSize
 * @param session
 * @param files
 * @returns
 */
export async function hostingBucketSyncFilesToIPFS(
  context,
  location,
  bucket: Bucket,
  maxBucketSize,
  session: FileUploadSession,
  files: any[],
) {
  const transferedFiles = [];

  //Check if size of files is greater than allowed bucket size.
  const s3Client: AWS_S3 = new AWS_S3();
  const filesOnS3 = await getSessionFilesOnS3(bucket, session);

  if (filesOnS3.size > maxBucketSize) {
    //TODO - define flow. What happens in that case - user should be notified
    throw new StorageCodeException({
      code: StorageErrorCode.NOT_ENOUGH_SPACE_IN_BUCKET,
      status: 400,
    });
  }

  let ipfsRes = undefined;
  try {
    ipfsRes = await IPFSService.uploadFilesToIPFSFromS3({
      fileUploadRequests: files,
      wrapWithDirectory: true,
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

  const conn = await context.mysql.start();

  try {
    //Clear bucket content - directories and files
    await bucket.clearBucketContent(context, conn);
    bucket.size = 0;

    //Create new directories & files
    const directories = [];
    for (const file of files.filter(
      (x) =>
        x.fileStatus ==
        FileUploadRequestFileStatus.SIGNED_URL_FOR_UPLOAD_GENERATED,
    )) {
      const fileDirectory = await generateDirectoriesForFUR(
        context,
        directories,
        file,
        bucket,
        ipfsRes.ipfsDirectories,
        conn,
      );

      //Create new file
      const tmpF = await new File({}, context)
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
          fileStatus: FileStatus.UPLOADED_TO_IPFS,
        })
        .insert(SerializeFor.INSERT_DB, conn);

      //now the file has CID and exists in IPFS node
      //update file-upload-request status
      file.fileStatus = FileUploadRequestFileStatus.UPLOAD_COMPLETED;
      await file.update(SerializeFor.UPDATE_DB, conn);

      bucket.size += file.size;
      bucket.uploadedSize += file.size;

      transferedFiles.push(tmpF);
    }

    //publish IPNS
    const ipns = await IPFSService.publishToIPNS(
      ipfsRes.parentDirCID.toV0().toString(),
      bucket.bucket_uuid,
    );

    //Update bucket CID & IPNS & Size
    bucket.CID = ipfsRes.parentDirCID.toV0().toString();
    bucket.IPNS = ipns.name;
    await bucket.update(SerializeFor.UPDATE_DB, conn);

    await context.mysql.commit(conn);

    //Delete files from S3
    /*for (const tmpS3FileList of filesOnS3.files) {
      await s3Client.removeFiles(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        tmpS3FileList.Contents.map((x) => {
          return { Key: x.Key };
        }),
      );
    }*/

    await new Lmas().writeLog({
      context: context,
      project_uuid: bucket.project_uuid,
      logType: LogType.INFO,
      message: 'Hosting bucket content changed',
      location: location,
      service: ServiceName.STORAGE,
      data: {
        bucket_uuid: bucket.bucket_uuid,
        bucketSize: bucket.size,
        bucketUploadedSize: bucket.uploadedSize,
      },
    });
  } catch (err) {
    await context.mysql.rollback(conn);
    throw err;
  }

  //Place storage order for parent CID to CRUST
  await pinFileToCRUST(
    context,
    bucket.bucket_uuid,
    ipfsRes.parentDirCID,
    ipfsRes.size,
  );

  return transferedFiles;
}
