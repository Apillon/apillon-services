import {
  ApillonHostingApiCreateS3UrlsForUploadDto,
  AppEnvironment,
  AWS_S3,
  CreateS3UrlsForUploadDto,
  CreateWebsiteDto,
  DeploymentQueryFilter,
  DeployWebsiteDto,
  env,
  Lmas,
  LogType,
  PopulateFrom,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  WebsiteQueryFilter,
  WebsitesQuotaReachedQueryFilter,
  writeLog,
} from '@apillon/lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DeploymentEnvironment, StorageErrorCode } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { deleteDirectory } from '../../lib/delete-directory';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { DeployWebsiteWorker } from '../../workers/deploy-website-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
import { Directory } from '../directory/models/directory.model';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';
import { File } from '../storage/models/file.model';
import { StorageService } from '../storage/storage.service';
import { Deployment } from './models/deployment.model';
import { Website } from './models/website.model';

export class HostingService {
  //#region web page CRUD
  static async listWebsites(
    event: { query: WebsiteQueryFilter },
    context: ServiceContext,
  ) {
    return await new Website(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new WebsiteQueryFilter(event.query));
  }

  static async listDomains(event: any, context: ServiceContext) {
    return await new Website({}, context).listDomains(context);
  }

  static async getWebsite(event: { id: any }, context: ServiceContext) {
    const website: Website = await new Website({}, context).populateById(
      event.id,
    );

    if (!website.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEBSITE_NOT_FOUND,
        status: 404,
      });
    }
    website.canAccess(context);

    //Get buckets
    await website.populateBucketsAndLink();

    return website.serialize(SerializeFor.PROFILE);
  }

  static async createWebsite(
    event: { body: CreateWebsiteDto },
    context: ServiceContext,
  ): Promise<any> {
    const website: Website = new Website(event.body, context);

    //check max web pages quota
    const numOfWebsites = await website.getNumOfWebsites();
    const maxWebsitesQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_WEBSITES,
      project_uuid: website.project_uuid,
    });

    if (numOfWebsites >= maxWebsitesQuota.value) {
      throw new StorageCodeException({
        code: StorageErrorCode.MAX_WEBSITES_REACHED,
        status: 400,
      });
    }

    await website.createNewWebsite(context);

    await new Lmas().writeLog({
      context,
      project_uuid: event.body.project_uuid,
      logType: LogType.INFO,
      message: 'New web page created',
      location: 'HostingService/createWebsite',
      service: ServiceName.STORAGE,
      data: website.serialize(),
    });

    return website.serialize(SerializeFor.PROFILE);
  }

  static async updateWebsite(
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const website: Website = await new Website({}, context).populateById(
      event.id,
    );

    if (!website.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEBSITE_NOT_FOUND,
        status: 404,
      });
    }
    website.canModify(context);

    //Check if domain was changed
    if (event.data.domain && website.domain != event.data.domain) {
      //Domain can be changed every 15 minutes
      if (website.domainChangeDate) {
        const domainChangeDate = new Date(website.domainChangeDate);
        const currDate = new Date();
        const difference = currDate.getTime() - domainChangeDate.getTime(); // This will give difference in milliseconds
        if (Math.round(difference / 60000) < 15) {
          throw new StorageCodeException({
            code: StorageErrorCode.WEBSITE_DOMAIN_CHANGE_NOT_ALLOWED,
            status: 400,
          });
        }
      }
      website.domainChangeDate = new Date();
    }

    website.populate(event.data, PopulateFrom.PROFILE);

    try {
      await website.validate();
    } catch (err) {
      await website.handle(err);
      if (!website.isValid()) {
        throw new StorageValidationException(website);
      }
    }

    await website.update();
    return website.serialize(SerializeFor.PROFILE);
  }

  static async maxWebsitesQuotaReached(
    event: { query: WebsitesQuotaReachedQueryFilter },
    context: ServiceContext,
  ) {
    const website: Website = new Website(
      { project_uuid: event.query.project_uuid },
      context,
    );

    const numOfWebsites = await website.getNumOfWebsites();
    const maxWebsitesQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_WEBSITES,
      project_uuid: website.project_uuid,
    });

    return { maxWebsitesQuotaReached: numOfWebsites >= maxWebsitesQuota.value };
  }

  //#endregion

  //#region upload files to website

  static async generateMultipleS3UrlsForUpload(
    event: { body: ApillonHostingApiCreateS3UrlsForUploadDto },
    context: ServiceContext,
  ): Promise<any> {
    //get website and bucket uuid
    const website = await new Website({}, context).populateById(
      event.body.website_uuid,
    );

    if (!website.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEBSITE_NOT_FOUND,
        status: 404,
      });
    }

    website.canAccess(context);

    await website.populateBucketsAndLink();

    const param: CreateS3UrlsForUploadDto =
      new CreateS3UrlsForUploadDto().populate({
        ...event.body,
        bucket_uuid: website.bucket.bucket_uuid,
      });
    return await StorageService.generateMultipleS3UrlsForUpload(
      { body: param },
      context,
    );
  }

  //#endregion

  //#region deploy web page

  /**
   * Send message to sqs, for web page deployment to specific environment(bucket)
   * @param event
   * @param context
   * @returns
   */
  static async deployWebsite(
    event: { body: DeployWebsiteDto },
    context: ServiceContext,
  ): Promise<any> {
    const website: Website = await new Website({}, context).populateById(
      event.body.website_id,
    );

    if (!website.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEBSITE_NOT_FOUND,
        status: 404,
      });
    }
    website.canModify(context);

    //Validate environment
    if (!DeploymentEnvironment[event.body.environment]) {
      throw new StorageCodeException({
        code: StorageErrorCode.DEPLOYMENT_ENVIRONMENT_NOT_VALID,
        status: 400,
      });
    }

    //Check if there are files in source bucket
    const sourceBucket: Bucket = await new Bucket({}, context).populateById(
      event.body.environment == DeploymentEnvironment.STAGING ||
        event.body.environment == DeploymentEnvironment.DIRECT_TO_PRODUCTION
        ? website.bucket_id
        : website.stagingBucket_id,
    );
    if (!(await sourceBucket.containsFiles())) {
      throw new StorageCodeException({
        code: StorageErrorCode.NO_FILES_TO_DEPLOY,
        status: 400,
      });
    }

    //Get previous deployment record
    const lastStagingDeployment: Deployment = await new Deployment(
      {},
      context,
    ).populateLastDeployment(website.id, DeploymentEnvironment.STAGING);

    const lastProductionDeployment: Deployment = await new Deployment(
      {},
      context,
    ).populateLastDeployment(website.id, DeploymentEnvironment.PRODUCTION);

    let deploymentNumber = 1;
    if (event.body.environment == DeploymentEnvironment.STAGING) {
      if (lastStagingDeployment.exists()) {
        deploymentNumber = lastStagingDeployment.number + 1;
      }
    } else {
      if (
        event.body.environment == DeploymentEnvironment.PRODUCTION &&
        lastStagingDeployment.cid == lastProductionDeployment.cid
      ) {
        throw new StorageCodeException({
          code: StorageErrorCode.NO_CHANGES_TO_DEPLOY,
          status: 400,
        });
      }
      if (lastProductionDeployment.exists()) {
        deploymentNumber = lastProductionDeployment.number + 1;
      }
    }

    //Create deployment record
    const d: Deployment = new Deployment({}, context).populate({
      website_id: website.id,
      bucket_id:
        event.body.environment == DeploymentEnvironment.STAGING
          ? website.stagingBucket_id
          : website.productionBucket_id,
      environment: event.body.environment,
      number: deploymentNumber,
    });

    try {
      await d.validate();
    } catch (err) {
      await d.handle(err);
      if (!d.isValid()) {
        throw new StorageValidationException(d);
      }
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
        clearBucketForUpload: event.body.clearBucketForUpload,
      };
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.DEPLOY_WEBSITE_WORKER,
        {
          parameters,
        },
      );

      const worker = new DeployWebsiteWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor({
        deployment_id: d.id,
        clearBucketForUpload: event.body.clearBucketForUpload,
      });
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.DEPLOY_WEBSITE_WORKER,
        [
          {
            deployment_id: d.id,
            clearBucketForUpload: event.body.clearBucketForUpload,
          },
        ],
        null,
        null,
      );
    }

    return d.serialize(SerializeFor.PROFILE);
  }

  //#endregion

  //#region get, list deployments

  static async getDeployment(event: { id: number }, context: ServiceContext) {
    const deployment: Deployment = await new Deployment(
      {},
      context,
    ).populateById(event.id);

    if (!deployment.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DEPLOYMENT_NOT_FOUND,
        status: 404,
      });
    }
    await deployment.canAccess(context);

    return deployment.serialize(SerializeFor.PROFILE);
  }

  static async listDeployments(
    event: { query: DeploymentQueryFilter },
    context: ServiceContext,
  ) {
    return await new Deployment(
      { website_id: event.query.website_id },
      context,
    ).getList(context, new DeploymentQueryFilter(event.query));
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
      if (event.file.s3FileKey) {
        const s3Client: AWS_S3 = new AWS_S3();
        await s3Client.remove(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          event.file.s3FileKey,
        );
      }

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

      if (bucketFiles.filter((x) => x.s3FileKey).length > 0) {
        const s3Client: AWS_S3 = new AWS_S3();
        await s3Client.removeFiles(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          bucketFiles
            .filter((x) => x.s3FileKey)
            .map((x) => {
              return { Key: x.s3FileKey };
            }),
        );
      }

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
