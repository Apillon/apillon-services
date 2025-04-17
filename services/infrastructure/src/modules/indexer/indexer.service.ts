import {
  AWS_S3,
  BaseProjectQueryFilter,
  CreateIndexerDto,
  env,
  IndexerBillingQueryFilter,
  IndexerLogsQueryFilter,
  IndexerUsageQueryFilter,
  Lmas,
  LogType,
  Mailing,
  Scs,
  ServiceName,
  SqlModelStatus,
  UpdateIndexerDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import { InfrastructureErrorCode } from '../../config/types';
import {
  InfrastructureCodeException,
  InfrastructureValidationException,
} from '../../lib/exceptions';
import { Indexer } from './models/indexer.model';
import { sqdApi } from './sqd/sqd.api';
import { DeploymentResponse } from './sqd/types/deploymentResponse';
import { IndexerBilling } from './models/indexer-billing.model';

export class IndexerService {
  static async createIndexer(
    { data }: { data: CreateIndexerDto },
    context: ServiceContext,
  ) {
    const indexer = new Indexer(
      {
        ...data,
        indexer_uuid: uuidV4(),
        status: SqlModelStatus.DRAFT,
      },
      context,
    );

    await indexer.validateOrThrow(InfrastructureValidationException);

    //Insert
    await indexer.insert();

    new Lmas().writeLog({
      context,
      project_uuid: indexer.project_uuid,
      logType: LogType.INFO,
      message: 'New indexer created',
      location: 'IndexerService/createIndexer',
      service: ServiceName.INFRASTRUCTURE,
      data: indexer.serialize(),
    });

    // Set mailerlite field indicating the user created an indexer
    new Mailing(context).setMailerliteField('has_indexer');

    return indexer.serializeByContext();
  }

  static async updateIndexer(
    { data }: { data: UpdateIndexerDto },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      data.indexer_uuid,
    );

    indexer.canModify(context);

    //Update indexer
    indexer.populate(data);
    await indexer.update();

    return indexer.serializeByContext();
  }

  static async listIndexers(
    event: {
      query: BaseProjectQueryFilter;
    },
    context: ServiceContext,
  ) {
    return await new Indexer(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(new BaseProjectQueryFilter(event.query));
  }

  static async getIndexer(
    { indexer_uuid }: { indexer_uuid: string },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      indexer_uuid,
    );

    let squid = undefined;
    let lastDeployment = undefined;

    //Get last deployment
    if (indexer.lastDeploymentId) {
      const { body } = await sqdApi<DeploymentResponse>({
        method: 'GET',
        path: `/orgs/${env.SQD_ORGANIZATION_CODE}/deployments/${indexer.lastDeploymentId}`,
      });

      lastDeployment = body;

      if (indexer.squidId != body.squid.id) {
        indexer.populate({
          squidId: body.squid.id,
          squidReference: body.squid.reference,
        });
        await indexer.update();
      }
    }

    //Get squid
    if (indexer.status != SqlModelStatus.DELETED && indexer.squidReference) {
      //call sqd API to get squid info
      const { body } = await sqdApi<any>({
        method: 'GET',
        path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/${indexer.squidReference}`,
      });

      squid = body;
    }

    return { ...indexer.serializeByContext(), squid, lastDeployment };
  }

  static async getIndexerLogs(
    event: { indexer_uuid: string; query: IndexerLogsQueryFilter },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      event.indexer_uuid,
    );

    if (!indexer.squidReference) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_IS_NOT_DEPLOYED,
        status: 400,
      });
    }

    const query = new IndexerLogsQueryFilter(event.query, context);
    let queryParams = query.search ? `&search=${query.search}` : '';

    query.container?.forEach((c) => (queryParams += `&container=${c}`));
    query.level?.forEach((l) => (queryParams += `&level=${l}`));
    queryParams += `&limit=${query.limit || 100}`;
    queryParams += query.nextPage ? `&nextPage=${query.nextPage}` : '';
    //call sqd API to get squid info
    const { body } = await sqdApi<any>({
      method: 'GET',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/${indexer.squidReference}/logs/history?from=${query.from.toISOString()}${queryParams}`,
    });

    return body;
  }

  /**
   * Generate S3 URL for indexer source code gzip file upload.
   * @param param0
   * @param context
   * @returns
   */
  static async getUrlForSourceCodeUpload(
    event: { indexer_uuid: string },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      event.indexer_uuid,
    );

    //Generate s3 URL
    const s3Client: AWS_S3 = new AWS_S3();
    const url = await s3Client.generateSignedUploadURL(
      env.INDEXER_BUCKET_FOR_SOURCE_CODE,
      indexer.indexer_uuid,
    );

    return url;
  }

  /**
   * Validate/modify .tar.gz file on s3 and execute squid deploy
   * @param event
   * @param context
   */
  static async deployIndexer(
    event: { indexer_uuid: string },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      event.indexer_uuid,
    );
    await indexer.canAccess(context);

    //Check that project has enough credits available
    const creditBalance = (
      await new Scs(context).getProjectCredit(indexer.project_uuid)
    ).data.balance;
    if (creditBalance < env.INDEXER_DEPLOY_MINIMUM_CREDIT_BALANCE) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.PROJECT_CREDIT_BALANCE_TOO_LOW,
        status: 400,
      });
    }

    //Validate compressed source file on s3
    const s3Client: AWS_S3 = new AWS_S3();

    if (
      !(await s3Client.exists(
        env.INDEXER_BUCKET_FOR_SOURCE_CODE,
        indexer.indexer_uuid,
      ))
    ) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_SOURCE_CODE_NOT_FOUND,
        status: 400,
      });
    }

    const source = await s3Client.get(
      env.INDEXER_BUCKET_FOR_SOURCE_CODE,
      indexer.indexer_uuid,
    );

    if (source.ContentType != 'application/gzip') {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_SOURCE_CODE_INVALID_FORMAT,
        status: 400,
      });
    }

    //execute indexer(squid) deploy
    const data = {
      artifactUrl: `https://${env.INDEXER_BUCKET_FOR_SOURCE_CODE}.s3.${env.AWS_REGION}.amazonaws.com/${indexer.indexer_uuid}`,
      manifestPath: 'squid.yaml',
      options: {
        overrideName: `${indexer.id}${env.APP_ENV}`,
      },
    };
    const { body } = await sqdApi<DeploymentResponse>({
      method: 'POST',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/deploy`,
      data,
    });

    indexer.lastDeploymentId = body.id;
    indexer.status = SqlModelStatus.ACTIVE;
    await indexer.update();

    return { ...indexer.serialize(), deployment: body };
  }

  static async getIndexerDeployments(
    event: { indexer_uuid: string },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      event.indexer_uuid,
    );

    if (!indexer.squidId) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_IS_NOT_DEPLOYED,
        status: 400,
      });
    }

    const { body } = await sqdApi<any>({
      method: 'GET',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/deployments?squidId=${indexer.squidId}`,
    });

    return body;
  }

  /**
   * Get indexer usage data (number of requests to indexer graphQL API) from squid API
   * @param event
   * @param context
   * @returns
   */
  static async getIndexerUsage(
    event: { query: IndexerUsageQueryFilter },
    context: ServiceContext,
  ) {
    const { indexer_uuid, from, to } = event.query;
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      indexer_uuid,
    );

    if (!indexer.squidId) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_IS_NOT_DEPLOYED,
        status: 400,
      });
    }

    const { body } = await sqdApi<any>({
      method: 'GET',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/metrics/ingress/${indexer.squidId}?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
    });

    return body;
  }

  static async listIndexerBilling(
    event: {
      query: IndexerBillingQueryFilter;
    },
    context: ServiceContext,
  ) {
    return await new IndexerBilling({}, context).getList(
      new IndexerBillingQueryFilter(event.query),
    );
  }

  /**
   * Call squid API to hibernate indexer and update DB record to INACTIVE
   * @param event
   * @param context
   * @returns
   */
  static async hibernateIndexer(
    event: { indexer_uuid: string },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      event.indexer_uuid,
    );

    await indexer.canModify(context);

    if (indexer.status != SqlModelStatus.ACTIVE || !indexer.squidReference) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_IS_NOT_DEPLOYED,
        status: 400,
      });
    }

    const { body } = await sqdApi<any>({
      method: 'POST',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/${indexer.squidReference}/hibernate`,
    });

    console.info('hibernate indexer response', body);

    indexer.status = SqlModelStatus.INACTIVE;
    await indexer.update();

    return indexer.serializeByContext();
  }

  /**
   * Call squid API to delete indexer if the indexer has reference (was deployed) and update DB record to DELETED
   * @param event
   * @param context
   * @returns
   */
  static async deleteIndexer(
    event: { indexer_uuid: string },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      event.indexer_uuid,
    );

    await indexer.canModify(context);

    if (indexer.squidReference) {
      const { body } = await sqdApi<any>({
        method: 'DELETE',
        path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/${indexer.squidReference}`,
      });

      console.info('delete indexer response', body);
    }

    await indexer.markDeleted();

    return indexer.serializeByContext();
  }
}
