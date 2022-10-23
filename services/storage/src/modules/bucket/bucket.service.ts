import {
  BucketQueryFilter,
  CreateBucketDto,
  PopulateFrom,
  SerializeFor,
} from 'at-lib';
import { StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { Bucket } from './models/bucket.model';

export class BucketService {
  static async listBuckets(
    event: { query: BucketQueryFilter },
    context: ServiceContext,
  ) {
    return await new Bucket({}, context).getList(context, event.query);
  }

  static async createBucket(
    event: { body: CreateBucketDto },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = new Bucket(event.body, context);
    //set default bucket size
    b.maxSize = 5242880;

    try {
      await b.validate();
    } catch (err) {
      await b.handle(err);
      if (!b.isValid()) throw new StorageValidationException(b);
    }

    await b.insert();
    return b.serialize(SerializeFor.PROFILE);
  }

  static async updateBucket(
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(event.id);

    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    b.populate(event.data, PopulateFrom.PROFILE);

    try {
      await b.validate();
    } catch (err) {
      await b.handle(err);
      if (!b.isValid()) throw new StorageValidationException(b);
    }

    await b.update();
    return b.serialize(SerializeFor.PROFILE);
  }

  static async deleteBucket(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(event.id);

    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }

    await b.delete();
    return b.serialize(SerializeFor.PROFILE);
  }
}
