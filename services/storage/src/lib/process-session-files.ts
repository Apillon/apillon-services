import {
  CacheKeyPrefix,
  EndFileUploadSessionDto,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  invalidateCacheMatch,
  runWithWorkers,
  writeLog,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  FileStatus,
  FileUploadRequestFileStatus,
  FileUploadSessionStatus,
} from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { File } from '../modules/storage/models/file.model';
import { StorageService } from '../modules/storage/storage.service';
import { getSessionFilesOnS3 } from './file-upload-session-s3-files';
import {
  generateDirectoriesForFUR,
  generateDirectoriesForFURs,
  generateDirectoriesFromPath,
} from './generate-directories-from-path';

/**
 * This function is called on session end.
 * Function creates files(which were uploaded to s3) and file structure  in bucket, from fileUploadRequests.
 * @param context
 * @param bucket
 * @param session
 * @returns
 */
export async function processSessionFiles(
  context: ServiceContext,
  bucket: Bucket,
  session: FileUploadSession,
  params: EndFileUploadSessionDto,
) {
  //Get FURs in session
  const fileUploadRequests: FileUploadRequest[] = await new FileUploadRequest(
    {},
    context,
  ).populateFileUploadRequestsInSession(session.id, context);
  //Get files on s3 for this session
  const filesOnS3 = await getSessionFilesOnS3(bucket, session?.session_uuid);

  //Check used storage
  await StorageService.checkStorageSpace(
    context,
    bucket.project_uuid,
    filesOnS3.size,
  );

  //get directories in bucket
  const directories = await new Directory(
    {},
    context,
  ).populateDirectoriesInBucket(bucket.id, context);

  if (params.directoryPath) {
    await generateDirectoriesFromPath(
      context,
      directories,
      params.directoryPath,
      bucket,
    );
    for (const fur of fileUploadRequests) {
      fur.path = fur.path
        ? params.directoryPath + '/' + fur.path
        : params.directoryPath;
    }
  }

  await generateDirectoriesForFURs(
    context,
    directories,
    fileUploadRequests,
    bucket,
  );

  //Loop through FURs
  await runWithWorkers(
    fileUploadRequests,
    20,
    context,
    async (fur: FileUploadRequest) => {
      fur = new FileUploadRequest(fur, context);
      const s3File = filesOnS3.files.find((x) => x.Key == fur.s3FileKey);
      //Check if file exists on s3
      if (!s3File) {
        //update fur
        fur.fileStatus =
          FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3;
        await fur.update();
      } else {
        try {
          const fileDirectory = await generateDirectoriesForFUR(
            context,
            directories,
            fur,
            bucket,
          );

          //Create new file
          await new File({}, context)
            .populate({
              file_uuid: fur.file_uuid,
              s3FileKey: fur.s3FileKey,
              name: fur.fileName,
              contentType: fur.contentType,
              project_uuid: bucket.project_uuid,
              bucket_id: bucket.id,
              path: fur.path,
              directory_id: fileDirectory?.id,
              size: s3File.Size,
              fileStatus: FileStatus.UPLOADED_TO_S3,
            })
            .insert(SerializeFor.INSERT_DB, undefined, true);
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
            fur.fileStatus =
              FileUploadRequestFileStatus.ERROR_CREATING_FILE_OBJECT;
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
        //update file-upload-request status --> Commented out, because this is only informational and can be skipped for sake of optimization
        /*fur.fileStatus = FileUploadRequestFileStatus.UPLOADED_TO_S3;
        await fur.update();*/
      }
    },
  );

  //update session
  session.sessionStatus = FileUploadSessionStatus.PROCESSED;
  await session.update();

  await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
    project_uuid: bucket.project_uuid,
  });

  return true;
}
