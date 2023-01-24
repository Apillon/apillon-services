import {
  CreateWebPageDto,
  Lmas,
  LogType,
  PopulateFrom,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  WebPageQueryFilter,
} from '@apillon/lib';
import { BucketType, StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { WebPage } from './models/web-page.model';
import { v4 as uuidV4 } from 'uuid';

export class HostingService {
  static async listWebPages(
    event: { query: WebPageQueryFilter },
    context: ServiceContext,
  ) {
    return await new WebPage(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new WebPageQueryFilter(event.query));
  }

  static async getWebPage(event: { id: number }, context: ServiceContext) {
    const webPage: WebPage = await new WebPage({}, context).populateById(
      event.id,
    );

    if (!webPage.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEB_PAGE_NOT_FOUND,
        status: 404,
      });
    }
    webPage.canAccess(context);

    return webPage.serialize(SerializeFor.PROFILE);
  }

  static async createWebPage(
    event: { body: CreateWebPageDto },
    context: ServiceContext,
  ): Promise<any> {
    const webPage: WebPage = new WebPage(event.body, context);

    //check max web pages quota
    const numOfWebPages = await webPage.getNumOfWebPages();
    const maxWebPagesQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_WEB_PAGES,
      project_uuid: webPage.project_uuid,
      object_uuid: context.user.user_uuid,
    });

    if (numOfWebPages >= maxWebPagesQuota.value) {
      throw new StorageCodeException({
        code: StorageErrorCode.MAX_WEB_PAGES_REACHED,
        status: 400,
      });
    }

    //Initialize buckets
    const bucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: webPage.project_uuid,
        bucketType: BucketType.HOSTING,
        name: webPage.name,
      },
      context,
    );
    try {
      await bucket.validate();
    } catch (err) {
      await bucket.handle(err);
      if (!bucket.isValid()) throw new StorageValidationException(bucket);
    }
    const stagingBucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: webPage.project_uuid,
        bucketType: BucketType.HOSTING,
        name: webPage.name + '_stagign',
      },
      context,
    );
    try {
      await stagingBucket.validate();
    } catch (err) {
      await stagingBucket.handle(err);
      if (!stagingBucket.isValid())
        throw new StorageValidationException(stagingBucket);
    }
    const productionBucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: webPage.project_uuid,
        bucketType: BucketType.HOSTING,
        name: webPage.name + '_production',
      },
      context,
    );
    try {
      await productionBucket.validate();
    } catch (err) {
      await productionBucket.handle(err);
      if (!productionBucket.isValid())
        throw new StorageValidationException(productionBucket);
    }

    const conn = await context.mysql.start();

    try {
      //Insert buckets
      await bucket.insert(SerializeFor.INSERT_DB, conn);
      await stagingBucket.insert(SerializeFor.INSERT_DB, conn);
      await productionBucket.insert(SerializeFor.INSERT_DB, conn);
      //Populate webPage
      webPage.populate({
        bucket_id: bucket.id,
        stagingBucket_id: stagingBucket.id,
        productionBucket_id: productionBucket.id,
      });
      //Insert web page record
      await webPage.insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: event.body.project_uuid,
        logType: LogType.ERROR,
        message: 'Error creating new web page',
        location: 'HostingService/createWebPage',
        service: ServiceName.STORAGE,
        data: {
          error: err,
          webPage: webPage.serialize(),
        },
      });

      throw err;
    }

    await new Lmas().writeLog({
      context,
      project_uuid: event.body.project_uuid,
      logType: LogType.INFO,
      message: 'New web page created',
      location: 'HostingService/createWebPage',
      service: ServiceName.STORAGE,
      data: webPage.serialize(),
    });

    return webPage.serialize(SerializeFor.PROFILE);
  }

  static async updateWebPage(
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const webPage: WebPage = await new WebPage({}, context).populateById(
      event.id,
    );

    if (!webPage.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEB_PAGE_NOT_FOUND,
        status: 404,
      });
    }
    webPage.canModify(context);

    webPage.populate(event.data, PopulateFrom.PROFILE);

    try {
      await webPage.validate();
    } catch (err) {
      await webPage.handle(err);
      if (!webPage.isValid()) throw new StorageValidationException(webPage);
    }

    await webPage.update();
    return webPage.serialize(SerializeFor.PROFILE);
  }
}
