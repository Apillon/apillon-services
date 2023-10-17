import {
  CreateDirectoryDto,
  DirectoryContentQueryFilter,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
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
    const bucket: Bucket = await new Bucket({}, context).populateById(
      event.body.bucket_id,
    );
    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }

    bucket.canModify(context);

    const d: Directory = new Directory(
      {
        ...event.body,
        directory_uuid: uuidV4(),
        project_uuid: bucket.project_uuid,
      },
      context,
    );

    try {
      await d.validate();
    } catch (err) {
      await d.handle(err);
      if (!d.isValid()) {
        throw new StorageValidationException(d);
      }
    }

    await d.insert();
    return d.serialize(SerializeFor.PROFILE);
  }

  static async updateDirectory(
    event: { directory_uuid: string; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const d: Directory = await new Directory({}, context).populateByUUID(
      event.directory_uuid,
    );

    if (!d.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_FOUND,
        status: 404,
      });
    }

    d.canModify(context);
    d.populate(event.data, PopulateFrom.PROFILE);

    try {
      await d.validate();
    } catch (err) {
      await d.handle(err);
      if (!d.isValid()) {
        throw new StorageValidationException(d);
      }
    }

    await d.update();
    return d.serialize(SerializeFor.PROFILE);
  }

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
    } else if (directory.status == SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_ALREADY_MARKED_FOR_DELETION,
        status: 400,
      });
    }
    directory.canModify(context);

    //check directory bucket
    const bucket: Bucket = await new Bucket({}, context).populateById(
      directory.bucket_id,
    );
    if (
      bucket.bucketType == BucketType.STORAGE ||
      bucket.bucketType == BucketType.NFT_METADATA
    ) {
      await directory.markForDeletion();
      return directory.serialize(SerializeFor.PROFILE);
    } else if (bucket.bucketType == BucketType.HOSTING) {
      return await HostingService.deleteDirectory({ directory }, context);
    }
  }

  static async unmarkDirectoryForDeletion(
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
    } else if (directory.status != SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_MARKED_FOR_DELETION,
        status: 400,
      });
    }
    directory.canModify(context);

    directory.status = SqlModelStatus.ACTIVE;

    await directory.update();
    return directory.serialize(SerializeFor.PROFILE);
  }
}
