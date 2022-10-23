import { CreateDirectoryDto, PopulateFrom, SerializeFor } from 'at-lib';
import { StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { Directory } from './models/directory.model';

export class DirectoryService {
  /*static async listBuckets(
    event: { query: BucketQueryFilter },
    context: ServiceContext,
  ) {
    return await new Bucket({}, context).getList(context, event.query);
  }*/

  static async createDirectory(
    event: { body: CreateDirectoryDto },
    context: ServiceContext,
  ): Promise<any> {
    const d: Directory = new Directory(event.body, context);

    try {
      await d.validate();
    } catch (err) {
      await d.handle(err);
      if (!d.isValid()) throw new StorageValidationException(d);
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
    d.populate(event.data, PopulateFrom.PROFILE);

    try {
      await d.validate();
    } catch (err) {
      await d.handle(err);
      if (!d.isValid()) throw new StorageValidationException(d);
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
    }

    await d.delete();
    return d.serialize(SerializeFor.PROFILE);
  }
}
