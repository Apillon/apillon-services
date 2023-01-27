import {
  AppEnvironment,
  AWS_S3,
  CreateWebPageDto,
  DeployWebPageDto,
  env,
  Lmas,
  LogType,
  PopulateFrom,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  WebPageQueryFilter,
  writeLog,
} from '@apillon/lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  BucketType,
  DeploymentEnvironment,
  StorageErrorCode,
} from '../../config/types';
import { ServiceContext } from '../../context';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { DeployWebPageWorker } from '../../workers/deploy-web-page-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
import { Deployment } from './models/deployment.model';
import { WebPage } from './models/web-page.model';
import { File } from '../storage/models/file.model';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';
import { Directory } from '../directory/models/directory.model';
import { deleteDirectory } from '../../lib/delete-directory';

export class HostingService {
  //#region web page CRUD
  static async listWebPages(
    event: { query: WebPageQueryFilter },
    context: ServiceContext,
  ) {
    return await new WebPage(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new WebPageQueryFilter(event.query));
  }

  static async listDomains(event: any, context: ServiceContext) {
    return await new WebPage({}, context).listDomains(context);
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

    //Get buckets
    await webPage.populateBuckets();

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
        name: webPage.name + '_staging',
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

  //#endregion

  //#region deploy web page

  /**
   * Send message to sqs, for web page deployment to specific environment(bucket)
   * @param event
   * @param context
   * @returns
   */
  static async deployWebPage(
    event: { body: DeployWebPageDto },
    context: ServiceContext,
  ): Promise<any> {
    const webPage: WebPage = await new WebPage({}, context).populateById(
      event.body.webPage_id,
    );

    if (!webPage.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEB_PAGE_NOT_FOUND,
        status: 404,
      });
    }
    webPage.canModify(context);

    //TODO check if there are files in bucket

    //Create deployment record
    const d: Deployment = new Deployment({}, context).populate({
      webPage_id: webPage.id,
      bucket_id:
        event.body.environment == DeploymentEnvironment.STAGING
          ? webPage.stagingBucket_id
          : webPage.productionBucket_id,
      environment: event.body.environment,
    });

    try {
      await d.validate();
    } catch (err) {
      await d.handle(err);
      if (!d.isValid()) throw new StorageValidationException(d);
    }

    await d.insert();

    //Execute deploy or Send message to SQS
    if (
      event.body.directDeploy &&
      (env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST)
    ) {
      //Directly calls worker, to deploy web page - USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const parameters = {
        deployment_id: d.id,
      };
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.DEPLOY_WEB_PAGE_WORKER,
        {
          parameters,
        },
      );

      const worker = new DeployWebPageWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor({
        deployment_id: d.id,
      });
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.DEPLOY_WEB_PAGE_WORKER,
        [
          {
            deployment_id: d.id,
          },
        ],
        null,
        null,
      );
    }

    return d.serialize(SerializeFor.PROFILE);
  }

  //#endregion

  //#region delete hosting bucket content

  static async deleteFile(
    event: { file: File },
    context: ServiceContext,
  ): Promise<any> {
    //If file has CID, it is most likely in staging or production bucket. Such files cannot be modified.
    if (event.file.CID && event.file.fileStatus > 2) {
      throw new StorageCodeException({
        code: StorageErrorCode.CANNOT_DELETE_FILES_IN_STG_OR_PROD_BUCKET,
        status: 400,
      });
    }

    const conn = await context.mysql.start();

    try {
      await event.file.markDeleted(conn);

      //Delete file from S3
      const s3Client: AWS_S3 = new AWS_S3();
      await s3Client.remove(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        event.file.s3FileKey,
      );

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
    }

    try {
      //Also delete FUR
      const fur: FileUploadRequest = await new FileUploadRequest(
        {},
        context,
      ).populateByUUID(event.file.file_uuid);
      if (fur.exists()) {
        await fur.markDeleted();
      }
    } catch (err) {
      writeLog(
        LogType.ERROR,
        'Error deleting file upload request',
        'hosting.service.ts',
        'deleteFile',
        err,
      );
    }
    return event.file.serialize(SerializeFor.PROFILE);
  }

  static async deleteDirectory(
    event: { directory: Directory },
    context: ServiceContext,
  ): Promise<any> {
    const conn = await context.mysql.start();

    try {
      const deleteDirRes = await deleteDirectory(
        context,
        event.directory.id,
        conn,
      );
      const s3Client: AWS_S3 = new AWS_S3();

      await s3Client.removeFiles(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        deleteDirRes.deletedFiles.map((x) => {
          return { Key: x.s3FileKey };
        }),
      );
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      writeLog(
        LogType.ERROR,
        'Error deleting directory',
        'hosting.service.ts',
        'deleteDirectory',
        err,
      );
      throw err;
    }

    return event.directory.serialize(SerializeFor.PROFILE);
  }

  static async clearBucketContent(
    event: { bucket: Bucket },
    context: ServiceContext,
  ): Promise<any> {
    const bucketFiles: File[] = await new File(
      {},
      context,
    ).populateFilesInBucket(event.bucket.id, context);

    const conn = await context.mysql.start();
    try {
      await event.bucket.clearBucketContent(context, conn);

      const s3Client: AWS_S3 = new AWS_S3();
      await s3Client.removeFiles(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        bucketFiles.map((x) => {
          return { Key: x.s3FileKey };
        }),
      );

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      writeLog(
        LogType.ERROR,
        'Error deleting bucket content',
        'hosting.service.ts',
        'deleteBucketContent',
        err,
      );

      throw err;
    }

    return event.bucket.serialize(SerializeFor.PROFILE);
  }

  //#endregion
}
