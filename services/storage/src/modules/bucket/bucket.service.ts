import {
  BucketQueryFilter,
  CreateBucketDto,
  CreateBucketWebhookDto,
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
import { BucketWebhook } from './models/bucket-webhook.model';

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
    //set default bucket size in bytes - NOTE this is not used in application. Max size is set in config MS
    b.maxSize = 5368709120;

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
      data: b.serialize(),
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

  //#region bucket webhook functions

  static async getBucketWebhook(
    event: { bucket_id: number },
    context: ServiceContext,
  ): Promise<any> {
    const webhook: BucketWebhook = await new BucketWebhook(
      {},
      context,
    ).populateByBucketId(event.bucket_id);

    if (!webhook.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_WEBHOOK_NOT_FOUND,
        status: 404,
      });
    }
    await webhook.canAccess(context);

    return webhook.serialize(SerializeFor.PROFILE);
  }

  static async createBucketWebhook(
    event: { body: CreateBucketWebhookDto },
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

    const webhook: BucketWebhook = new BucketWebhook(event.body, context);
    try {
      await webhook.validate();
    } catch (err) {
      await webhook.handle(err);
      if (!webhook.isValid()) throw new StorageValidationException(webhook);
    }

    //Check if webhook for this bucket already exists
    if (
      (await new BucketWebhook({}, context).populateByBucketId(b.id)).exists()
    ) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEBHOOK_ALREADY_EXISTS_FOR_PROJECT,
        status: 409,
      });
    }

    await webhook.insert();

    await new Lmas().writeLog({
      context,
      project_uuid: b.project_uuid,
      logType: LogType.INFO,
      message: 'New bucket webhook created',
      location: 'BucketService/createBucket',
      service: ServiceName.STORAGE,
      data: {
        bucket_uuid: b.bucket_uuid,
      },
    });

    return webhook.serialize(SerializeFor.PROFILE);
  }

  static async updateBucketWebhook(
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const webhook: BucketWebhook = await new BucketWebhook(
      {},
      context,
    ).populateById(event.id);

    if (!webhook.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_WEBHOOK_NOT_FOUND,
        status: 404,
      });
    }
    await webhook.canModify(context);

    webhook.populate(event.data);
    try {
      await webhook.validate();
    } catch (err) {
      await webhook.handle(err);
      if (!webhook.isValid()) throw new StorageValidationException(webhook);
    }

    await webhook.update();
    return webhook.serialize(SerializeFor.PROFILE);
  }

  static async deleteBucketWebhook(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const webhook: BucketWebhook = await new BucketWebhook(
      {},
      context,
    ).populateById(event.id);

    if (!webhook.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_WEBHOOK_NOT_FOUND,
        status: 404,
      });
    }
    await webhook.canModify(context);

    await webhook.delete();
    return webhook.serialize(SerializeFor.PROFILE);
  }

  //#region
}
