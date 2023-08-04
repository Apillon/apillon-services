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
    const b: Bucket = await new Bucket({}, context).populateByUUID(
      event.query.bucket_uuid,
    );
    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    b.canAccess(context);

    return await new Directory({}, context).getDirectoryContent(
      context,
      new DirectoryContentQueryFilter(event.query, context),
    );
  }

  static async createDirectory(
    event: { body: CreateDirectoryDto },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(
      event.body.bucket_id,
    );
    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }

    b.canModify(context);

    const d: Directory = new Directory(
      { ...event.body, directory_uuid: uuidV4(), project_uuid: b.project_uuid },
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
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const d: Directory = await new Directory({}, context).populateById(
      event.id,
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
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const d: Directory = await new Directory({}, context).populateById(
      event.id,
    );

    if (!d.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_FOUND,
        status: 404,
      });
    } else if (d.status == SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_ALREADY_MARKED_FOR_DELETION,
        status: 400,
      });
    }
    d.canModify(context);

    //check directory bucket
    const b: Bucket = await new Bucket({}, context).populateById(d.bucket_id);
    if (
      b.bucketType == BucketType.STORAGE ||
      b.bucketType == BucketType.NFT_METADATA
    ) {
      await d.markForDeletion();
      return d.serialize(SerializeFor.PROFILE);
    } else if (b.bucketType == BucketType.HOSTING) {
      return await HostingService.deleteDirectory({ directory: d }, context);
    }
  }

  static async unmarkDirectoryForDeletion(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const d: Directory = await new Directory({}, context).populateById(
      event.id,
    );

    if (!d.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_FOUND,
        status: 404,
      });
    } else if (d.status != SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_MARKED_FOR_DELETION,
        status: 400,
      });
    }
    d.canModify(context);

    d.status = SqlModelStatus.ACTIVE;

    await d.update();
    return d.serialize(SerializeFor.PROFILE);
  }
}
