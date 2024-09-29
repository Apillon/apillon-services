import {
  AWS_S3,
  BaseProjectQueryFilter,
  CodeException,
  CreateIndexerDto,
  CreateRpcUrlDto,
  env,
  IndexerLogsQueryFilter,
  Lmas,
  LogType,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  InfrastructureCodeException,
  InfrastructureValidationException,
} from '../../lib/exceptions';
import { Indexer } from './models/indexer.model';
import { IndexerDeploy } from './models/indexer-deploy.model';
import { InfrastructureErrorCode } from '../../config/types';
import { sqdApi } from './sqd/sqd.api';
import { DeploymentResponse } from './sqd/types/deploymentResponse';

export class IndexerService {
  static async createIndexer(
    { data }: { data: CreateIndexerDto },
    context: ServiceContext,
  ) {
    const indexer = new Indexer(
      {
        ...data,
        indexer_uuid: uuidV4(),
      },
      context,
    );

    await indexer.validateOrThrow(InfrastructureValidationException);

    //Insert
    await indexer.insert();

    await Promise.all([
      new Lmas().writeLog({
        context,
        project_uuid: indexer.project_uuid,
        logType: LogType.INFO,
        message: 'New indexer created',
        location: 'IndexerService/createIndexer',
        service: ServiceName.INFRASTRUCTURE,
        data: indexer.serialize(),
      }),
    ]);

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

    if (indexer.status == SqlModelStatus.ACTIVE && indexer.reference) {
      //call sqd API to get squid info
      const { body } = await sqdApi<any>({
        method: 'GET',
        path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/${indexer.reference}`,
      });

      squid = body.payload;
    }

    return { ...indexer.serializeByContext(), squid };
  }

  static async getIndexerLogs(
    event: { indexer_uuid: string; query: IndexerLogsQueryFilter },
    context: ServiceContext,
  ) {
    const indexer = await new Indexer({}, context).populateByUUIDAndCheckAccess(
      event.indexer_uuid,
    );

    if (indexer.status != SqlModelStatus.ACTIVE || indexer.reference) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_IS_NOT_DEPLOYED,
        status: 400,
      });
    }

    //call sqd API to get squid info
    const { body } = await sqdApi<any>({
      method: 'GET',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/${indexer.reference}/logs/history?from=${event.query.from.toISOString()}`,
    });

    return body;
  }

  /**
   * Create initial indexer deploy DB record and generate S3 URL for upload.
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

    //Validate compressed source file on s3
    const s3Client: AWS_S3 = new AWS_S3();
    const source = await s3Client.get(
      env.INDEXER_BUCKET_FOR_SOURCE_CODE,
      indexer.indexer_uuid,
    );

    if (source.ContentType != 'application/gzip') {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_SOURCE_CODE_INVALID_FORMAT,
        status: 404,
      });
    }

    //execute indexer(squid) deploy
    const data = {
      artifactUrl: `https://${env.INDEXER_BUCKET_FOR_SOURCE_CODE}.s3.${env.AWS_REGION}.amazonaws.com/${indexer.indexer_uuid}`,
      manifestPath: 'squid.yaml',
    };
    const { body } = await sqdApi<DeploymentResponse>({
      method: 'POST',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/deploy`,
      data,
    });

    return body;
  }
}
