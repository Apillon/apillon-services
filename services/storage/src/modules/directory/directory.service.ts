import {
  AWS_S3,
  CodeException,
  CreateDirectoryDto,
  DirectoryContentQueryFilter,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  env,
} from '@apillon/lib';
import { BucketType, StorageErrorCode } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { Directory } from './models/directory.model';
import { v4 as uuidV4 } from 'uuid';
import { Bucket } from '../bucket/models/bucket.model';
import { HostingService } from '../hosting/hosting.service';
import { deleteDirectory } from '../../lib/delete-directory';

export class DirectoryService {
  static async listDirectoryContent(
    event: { query: DirectoryContentQueryFilter },
    context: ServiceContext,
  ) {
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.query.bucket_uuid,
    );
    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    bucket.canAccess(context);

    return await new Directory({}, context).getDirectoryContent(
      context,
      new DirectoryContentQueryFilter(event.query, context),
      bucket,
    );
  }

  static async createDirectory(
    event: { body: CreateDirectoryDto },
    context: ServiceContext,
  ): Promise<any> {
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );
    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }

    bucket.canModify(context);

    let parentDirectory: Directory;
    if (event.body.parentDirectory_uuid) {
      parentDirectory = await new Directory({}, context).populateByUUID(
        event.body.parentDirectory_uuid,
      );
    }

    const directory: Directory = new Directory(
      {
        ...event.body,
        directory_uuid: uuidV4(),
        bucket_id: bucket.id,
        project_uuid: bucket.project_uuid,
        parentDirectory_id: parentDirectory?.id,
      },
      context,
    );

    await directory.validateOrThrow(StorageValidationException);

    await directory.insert();
    return {
      ...directory.serialize(SerializeFor.PROFILE),
      parentDirectory_uuid: parentDirectory?.directory_uuid,
    };
  }

  static async updateDirectory(
    event: { directory_uuid: string; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const directory: Directory = await new Directory(
      {},
      context,
    ).populateByUUID(event.directory_uuid);

    if (!directory.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_FOUND,
        status: 404,
      });
    }

    directory.canModify(context);
    directory.populate(event.data, PopulateFrom.PROFILE);

    await directory.validateOrThrow(StorageValidationException);

    await directory.update();
    return directory.serialize(SerializeFor.PROFILE);
  }

  /**
   * Delete directory, it's subdirectories and files. Remove files from S3(for hosting) and update bucket size.
   * @param event
   * @param context
   * @returns
   */
  static async deleteDirectory(
    event: { directory_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const directory: Directory = await new Directory(
      {},
      context,
    ).populateByUUID(event.directory_uuid);

    if (!directory.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_FOUND,
        status: 404,
      });
    }
    directory.canModify(context);

    //check directory bucket
    const bucket: Bucket = await new Bucket({}, context).populateById(
      directory.bucket_id,
    );

    const conn = await context.mysql.start();

    try {
      const deleteDirRes = await deleteDirectory(context, directory, conn);

      if (bucket.bucketType == BucketType.HOSTING) {
        //For hosting bucket, delete files from S3
        const s3Client: AWS_S3 = new AWS_S3();

        if (deleteDirRes.deletedFiles.filter((x) => x.s3FileKey).length > 0) {
          await s3Client.removeFiles(
            env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
            deleteDirRes.deletedFiles
              .filter((x) => x.s3FileKey)
              .map((x) => {
                return { Key: x.s3FileKey };
              }),
          );
        }
      }

      bucket.size -= deleteDirRes.sizeOfDeletedFiles;
      await bucket.update(SerializeFor.UPDATE_DB, conn);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw await new CodeException({
        code: StorageErrorCode.ERROR_DELETING_DIRECTORY,
        status: 500,
      }).writeToMonitor({ sendAdminAlert: true });
    }

    return true;
  }
}
