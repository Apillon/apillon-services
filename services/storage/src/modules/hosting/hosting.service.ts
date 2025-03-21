import {
  Ams,
  ApillonHostingApiCreateS3UrlsForUploadDto,
  AWS_S3,
  CreateDeploymentConfigDto,
  CreateS3UrlsForUploadDto,
  CreateWebsiteDto,
  DeploymentQueryFilter,
  DeployMicroservice,
  DeployWebsiteDto,
  DomainQueryFilter,
  EmailDataDto,
  EmailTemplate,
  env,
  Lmas,
  LogType,
  Mailing,
  PopulateFrom,
  ProductCode,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  spendCreditAction,
  SpendCreditDto,
  SqlModelStatus,
  WebsiteQueryFilter,
  WebsitesQuotaReachedQueryFilter,
  writeLog,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  DbTables,
  DeploymentEnvironment,
  DeploymentStatus,
  StorageErrorCode,
  WebsiteDomainStatus,
} from '../../config/types';
import {
  StorageCodeException,
  StorageNotFoundException,
  StorageValidationException,
} from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { IPFSService } from '../ipfs/ipfs.service';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';
import { File } from '../storage/models/file.model';
import { StorageService } from '../storage/storage.service';
import { Deployment } from './models/deployment.model';
import { Website } from './models/website.model';
import { checkDomainDns } from '../../lib/domains';

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

  static async listDomains(
    event: { query: DomainQueryFilter },
    context: ServiceContext,
  ) {
    return await new Website({}, context).listDomains(event.query);
  }

  static async getDomains(event: {}, context: ServiceContext) {
    return await new Website({}, context).getDomains();
  }

  static async getWebsite(event: { id: any }, context: ServiceContext) {
    const website: Website = await new Website({}, context).populateById(
      event.id,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }
    website.canAccess(context);

    //Get buckets
    await website.populateBucketsAndLink();

    return website.serializeByContext();
  }

  static async getWebsiteWithAccess(
    event: {
      websiteUuid: string;
      hasModifyAccess: boolean;
    },
    context: ServiceContext,
  ) {
    const website = await new Website({}, context).populateByUUID(
      event.websiteUuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }

    event.hasModifyAccess
      ? website.canModify(context)
      : website.canAccess(context);

    return website.serializeByContext();
  }

  static async createWebsite(
    event: { body: CreateWebsiteDto },
    context: ServiceContext,
  ): Promise<any> {
    const website: Website = new Website(event.body, context);

    if (website.domain) {
      //Check if domain already exists
      const tmpWebsite = await new Website({}, context).populateByDomain(
        website.domain,
      );
      if (tmpWebsite.exists()) {
        throw new StorageCodeException({
          code: StorageErrorCode.WEBSITE_WITH_THAT_DOMAIN_ALREADY_EXISTS,
          status: 409,
        });
      }
    }

    const website_uuid = uuidV4();
    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: event.body.project_uuid,
        product_id: ProductCode.HOSTING_WEBSITE,
        referenceTable: DbTables.WEBSITE,
        referenceId: website_uuid,
        location: 'HostingService/createWebsite',
        service: ServiceName.STORAGE,
      },
      context,
    );

    await spendCreditAction(context, spendCredit, () =>
      website.createNewWebsite(context, website_uuid),
    );

    await Promise.all([
      new Lmas().writeLog({
        context,
        project_uuid: event.body.project_uuid,
        logType: LogType.INFO,
        message: 'New web page created',
        location: 'HostingService/createWebsite',
        service: ServiceName.STORAGE,
        data: website.serialize(),
      }),
      // Set mailerlite field indicating the user has a website
      new Mailing(context).setMailerliteField('has_website'),
    ]);

    if (event.body.deploymentConfig) {
      const payload = new CreateDeploymentConfigDto({}, context).populate({
        ...event.body.deploymentConfig.serialize(),
        websiteUuid: website_uuid,
      });

      // Should not be populated as we reuse the same DTO on endpoint
      payload.skipWebsiteCheck = true;

      await new DeployMicroservice(context).createDeploymentConfig(payload);
    }

    return website.serializeByContext();
  }

  static async updateWebsite(
    event: { website_uuid: string; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const website: Website = await new Website({}, context).populateById(
      event.website_uuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }
    website.canModify(context);

    let websiteDomainUpdated = false;

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

      //Check if domain already exists
      const tmpWebsite = await new Website({}, context).populateByDomain(
        event.data.domain,
      );
      if (tmpWebsite.exists()) {
        throw new StorageCodeException({
          code: StorageErrorCode.WEBSITE_WITH_THAT_DOMAIN_ALREADY_EXISTS,
          status: 409,
        });
      }

      website.domainChangeDate = new Date();
      websiteDomainUpdated = true;
    }

    website.populate(event.data, PopulateFrom.PROFILE);

    await website.validateOrThrow(StorageValidationException);

    if (websiteDomainUpdated) {
      const spendCredit: SpendCreditDto = new SpendCreditDto(
        {
          project_uuid: website.project_uuid,
          product_id: ProductCode.HOSTING_CHANGE_WEBSITE_DOMAIN,
          referenceTable: DbTables.WEBSITE,
          referenceId: website.website_uuid + new Date().toLocaleDateString(),
          location: 'HostingService/updateWebsite',
          service: ServiceName.STORAGE,
        },
        context,
      );

      await spendCreditAction(context, spendCredit, () => website.update());
    } else {
      await website.update();
    }

    return website.serialize(SerializeFor.PROFILE);
  }

  /**
   * Remove a website's domain
   * @param {{ website_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Website>}
   */
  static async removeWebsiteDomain(
    event: { website_uuid: string },
    context: ServiceContext,
  ): Promise<Website> {
    const website: Website = await new Website({}, context).populateByUUID(
      event.website_uuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }
    website.canModify(context);

    website.domain = null;
    website.domainChangeDate = new Date();

    await website.update();

    return website.serialize(SerializeFor.PROFILE) as Website;
  }

  /**
   * Set a website's status to archived
   * @param {{ website_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Website>}
   */
  static async archiveWebsite(
    event: { website_uuid: string },
    context: ServiceContext,
  ): Promise<Website> {
    const website: Website = await new Website({}, context).populateByUUID(
      event.website_uuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }
    website.canModify(context);

    return await website.markArchived();
  }

  /**
   * Set a website's status to active
   * @param {{ website_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Website>}
   */
  static async activateWebsite(
    event: { website_uuid: string },
    context: ServiceContext,
  ): Promise<Website> {
    const website: Website = await new Website({}, context).populateByUUID(
      event.website_uuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }
    website.canModify(context);

    return await website.markActive();
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

  /**
   * Check if the domain is pointing to Apillon IP and updates website domainStatus property.
   * @param event
   * @param context
   * @returns Serialized website
   */
  static async checkWebsiteDomainDns(
    event: { website_uuid: string },
    context: ServiceContext,
  ) {
    const website: Website = await new Website({}, context).populateByUUID(
      event.website_uuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }
    website.canAccess(context);

    if (website.domain && website.domainStatus != WebsiteDomainStatus.HAS_CDN) {
      const lookupRes = await checkDomainDns(website.domain);

      website.domainLastCheckDate = new Date();
      website.domainStatus = lookupRes
        ? WebsiteDomainStatus.OK
        : WebsiteDomainStatus.INVALID;

      await website.update();
    }

    return website.serializeByContext(context);
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
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }

    website.canAccess(context);

    await website.populateBucketsAndLink();

    const param: CreateS3UrlsForUploadDto =
      new CreateS3UrlsForUploadDto().populate({
        ...event.body,
        bucket_uuid: website.bucket.bucket_uuid,
        session_uuid: event.body.sessionUuid,
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
    const website: Website = await new Website({}, context).populateByUUID(
      event.body.website_uuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
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

    const filesInBucket = await new File({}, context).populateFilesInBucket(
      sourceBucket.id,
      context,
    );

    //Source bucket must contain files. One of them should be index.html
    if (filesInBucket.length == 0) {
      throw new StorageCodeException({
        code: StorageErrorCode.NO_FILES_TO_DEPLOY,
        status: 400,
      });
      // Content type can also be checked, but it may not always be provided
    } else if (!filesInBucket.find((x) => x.name === 'index.html')) {
      throw new StorageCodeException({
        code: StorageErrorCode.INDEX_HTML_FILE_NOT_PRESENT,
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

    //Get deployment number
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

    //Check if enough storage available
    await StorageService.checkStorageSpace(
      context,
      sourceBucket.project_uuid,
      sourceBucket.size,
    );

    //Create deployment record
    const deployment: Deployment = new Deployment({}, context).populate({
      deployment_uuid: uuidV4(),
      website_id: website.id,
      bucket_id:
        event.body.environment == DeploymentEnvironment.STAGING
          ? website.stagingBucket_id
          : website.productionBucket_id,
      environment: event.body.environment,
      number: deploymentNumber,
      directDeploy: event.body.directDeploy,
      clearBucketForUpload: event.body.clearBucketForUpload,
      createTime: new Date(),
      updateTime: new Date(),
    });

    await deployment.validateOrThrow(StorageValidationException);

    await deployment.insert();

    //Spend credit
    try {
      const spendCredit: SpendCreditDto = new SpendCreditDto(
        {
          project_uuid: website.project_uuid,
          product_id:
            event.body.environment == DeploymentEnvironment.STAGING
              ? ProductCode.HOSTING_DEPLOY_TO_STAGING
              : ProductCode.HOSTING_DEPLOY_TO_PRODUCTION,
          referenceTable: DbTables.DEPLOYMENT,
          referenceId: deployment.deployment_uuid,
          location: 'HostingService/deployWebsite',
          service: ServiceName.STORAGE,
        },
        context,
      );
      await new Scs(context).spendCredit(spendCredit);
    } catch (error) {
      //If not enough credit or spend fails, delete deployment and throw error.
      await deployment.delete();
      throw error;
    }

    await deployment.deploy();

    return deployment.serializeByContext();
  }

  //#endregion

  //#region get, list deployments

  static async getDeployment(
    event: { deployment_uuid: string },
    context: ServiceContext,
  ) {
    const deployment: Deployment = await new Deployment(
      {},
      context,
    ).populateByUUID(event.deployment_uuid, 'deployment_uuid');

    if (!deployment.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.DEPLOYMENT_NOT_FOUND);
    }
    await deployment.canAccess(context);

    if (
      [DeploymentStatus.REJECTED, DeploymentStatus.IN_REVIEW].includes(
        deployment.deploymentStatus as DeploymentStatus,
      )
    ) {
      //This properties should not be passed to user if deployment is in review
      deployment.cid = undefined;
      deployment.cidv1 = undefined;
      deployment.size = undefined;
    }

    return deployment.serializeByContext();
  }

  static async listDeployments(
    event: { query: DeploymentQueryFilter },
    context: ServiceContext,
  ) {
    const website = await new Website({}, context).populateByUUID(
      event.query.website_uuid,
    );
    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }
    website.canAccess(context);

    return await new Deployment({}, context).getList(
      context,
      new DeploymentQueryFilter(event.query),
    );
  }

  static async approveDeployment(
    event: { deployment_uuid: string },
    context: ServiceContext,
  ) {
    const deployment: Deployment = await new Deployment(
      {},
      context,
    ).populateByUUID(event.deployment_uuid, 'deployment_uuid');

    if (!deployment.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.DEPLOYMENT_NOT_FOUND);
    }

    if (deployment.deploymentStatus != DeploymentStatus.IN_REVIEW) {
      throw new StorageCodeException({
        code: StorageErrorCode.DEPLOYMENT_ALREADY_REVIEWED,
        status: 409,
      });
    }

    deployment.deploymentStatus = DeploymentStatus.APPROVED;
    await deployment.update();

    await deployment.deploy();

    return true;
  }

  static async rejectDeployment(
    event: { deployment_uuid: string },
    context: ServiceContext,
  ) {
    const deployment: Deployment = await new Deployment(
      {},
      context,
    ).populateByUUID(event.deployment_uuid, 'deployment_uuid');

    if (!deployment.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.DEPLOYMENT_NOT_FOUND);
    }

    if (deployment.deploymentStatus != DeploymentStatus.IN_REVIEW) {
      throw new StorageCodeException({
        code: StorageErrorCode.DEPLOYMENT_ALREADY_REVIEWED,
        status: 409,
      });
    }

    deployment.deploymentStatus = DeploymentStatus.REJECTED;
    await deployment.update();

    const website: Website = await new Website({}, context).populateById(
      deployment.website_id,
    );
    //Unpin CID from IPFS
    const ipfsService = new IPFSService(context, website.project_uuid, true);
    await ipfsService.unpinCidFromCluster(deployment.cid);

    //Get project owner
    const projectOwner = (
      await new Ams(context).getProjectOwner(website.project_uuid)
    ).data;

    if (projectOwner?.email) {
      //send email
      await new Mailing(context).sendMail(
        new EmailDataDto({
          mailAddresses: [projectOwner.email],
          templateName: EmailTemplate.WEBSITE_DEPLOYMENT_REJECTED,
        }),
      );
    }

    return true;
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
      throw new StorageCodeException({
        code: StorageErrorCode.ERROR_DELETING_FILE,
        status: 500,
        sourceFunction: 'HostingService.deleteFile',
      });
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
