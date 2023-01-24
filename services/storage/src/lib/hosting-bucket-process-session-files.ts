import { FileStatus, FileUploadRequestFileStatus } from '../config/types';
import { ServiceContext } from '../context';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { getSessionFilesOnS3 } from './file-upload-session-s3-files';
import { generateDirectoriesForFUR } from './generate-directories-from-path';
import { File } from '../modules/storage/models/file.model';
import { Lmas, LogType, ServiceName, writeLog } from '@apillon/lib';

export async function hostingBucketProcessSessionFiles(
  context: ServiceContext,
  bucket: Bucket,
  session: FileUploadSession,
) {
  //Get FURs in session
  const fileUploadRequests: FileUploadRequest[] = await new FileUploadRequest(
    {},
    context,
  ).populateFileUploadRequestsInSession(session.id, context);
  //Get files on s3 for this session
  const filesOnS3 = await getSessionFilesOnS3(bucket, session);

  //get directories in bucket
  const directories = await new Directory(
    {},
    context,
  ).populateDirectoriesInBucket(bucket.id, context);

  //Loop through FURs
  for (const fur of fileUploadRequests) {
    const s3File = filesOnS3.files.find((x) => x.Key == fur.s3FileKey);
    //Check if file exists on s3
    if (!s3File) {
      //update fur
      fur.fileStatus = FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3;
      await fur.update();
      continue;
    }
    try {
      const fileDirectory = await generateDirectoriesForFUR(
        context,
        directories,
        fur,
        bucket,
      );

      //check if file already exists
      const existingFile = await new File(
        {},
        context,
      ).populateByNameAndDirectory(bucket.id, fur.fileName, fileDirectory?.id);

      if (existingFile.exists()) {
        //Update existing file
        existingFile.populate({
          s3FileKey: fur.s3FileKey,
          name: fur.fileName,
          contentType: fur.contentType,
          size: s3File.Size,
          fileStatus: FileStatus.UPLOADED_TO_S3,
        });

        await existingFile.update();
      } else {
        //Create new file
        const tmpF = await new File({}, context)
          .populate({
            file_uuid: fur.file_uuid,
            s3FileKey: fur.s3FileKey,
            name: fur.fileName,
            contentType: fur.contentType,
            project_uuid: bucket.project_uuid,
            bucket_id: bucket.id,
            directory_id: fileDirectory?.id,
            size: s3File.Size,
            fileStatus: FileStatus.UPLOADED_TO_S3,
          })
          .insert();
      }
    } catch (err) {
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.ERROR,
        message: 'Error creating directory or file',
        location: 'hostingBucketProcessSessionFiles',
        service: ServiceName.STORAGE,
        data: {
          fileUploadRequest: fur.serialize(),
          error: err,
        },
      });

      try {
        fur.fileStatus = FileUploadRequestFileStatus.ERROR_CREATING_FILE_OBJECT;
        await fur.update();
      } catch (err2) {
        writeLog(
          LogType.ERROR,
          'Error updating fileUploadRequest status to ERROR_CREATING_FILE_OBJECT',
          'hosting-bucket-process-session-files.ts',
          'hostingBucketProcessSessionFiles',
          err2,
        );
      }

      throw err;
    }

    //now the file has CID, exists in IPFS node and in bucket
    //update file-upload-request status
    fur.fileStatus = FileUploadRequestFileStatus.UPLOADED_TO_S3;
    await fur.update();
  }

  return true;
}
