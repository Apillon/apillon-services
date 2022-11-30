import {
  BucketQueryFilter,
  CreateBucketDto,
  Lmas,
  LogType,
  PopulateFrom,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
import { StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { Bucket } from './models/bucket.model';
import { v4 as uuidV4 } from 'uuid';

export class BucketService {
  static async listBuckets(
    event: { query: BucketQueryFilter },
    context: ServiceContext,
  ) {
    return await new Bucket(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new BucketQueryFilter(event.query));
  }

  static async createBucket(
    event: { body: CreateBucketDto },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = new Bucket(
      { ...event.body, bucket_uuid: uuidV4() },
      context,
    );
    //set default bucket size
    b.maxSize = 5242880;

    try {
      await b.validate();
    } catch (err) {
      await b.handle(err);
      if (!b.isValid()) throw new StorageValidationException(b);
    }

    await b.insert();

    await new Lmas().writeLog({
      context,
      project_uuid: event.body.project_uuid,
      logType: LogType.INFO,
      message: 'New bucket created',
      location: 'BucketService/createBucket',
      service: ServiceName.STORAGE,
    });

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
    b.canModify(context);

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

    b.canModify(context);

    await b.delete();
    return b.serialize(SerializeFor.PROFILE);
  }
}
