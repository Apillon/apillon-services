import {
  AdvancedSQLModel,
  AppEnvironment,
  CodeException,
  Context,
  DefaultUserRole,
  DeploymentQueryFilter,
  ErrorCode,
  ForbiddenErrorCodes,
  JwtExpireTime,
  JwtTokenType,
  Lmas,
  LogType,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  env,
  generateJwtToken,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  dateParser,
  integerParser,
  stringParser,
  booleanParser,
} from '@rawmodel/parsers';
import {
  DbTables,
  DeploymentEnvironment,
  DeploymentStatus,
  StorageErrorCode,
} from '../../../config/types';
import { Website } from './website.model';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { WorkerName } from '../../../workers/worker-executor';
import { DeployWebsiteWorker } from '../../../workers/deploy-website-worker';
import { ProjectConfig } from '../../config/models/project-config.model';
import { UrlScreenshotMicroservice } from '../../../lib/url-screenshot';

export class Deployment extends AdvancedSQLModel {
  public readonly tableName = DbTables.DEPLOYMENT;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  //# region overrides of basic properties for model with uuid property

  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.LOGGER,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.LOGGER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status?: number;

  /**
   * Created at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
    defaultValue: new Date(),
  })
  public createTime?: Date;

  /**
   * Updated at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;

  //# endregion

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DEPLOYMENT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public deployment_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DEPLOYMENT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public website_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DEPLOYMENT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DEPLOYMENT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public environment: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    defaultValue: DeploymentStatus.INITIATED,
    fakeValue: DeploymentStatus.INITIATED,
  })
  public deploymentStatus: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
  })
  public cid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
  })
  public cidv1: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public size: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public number: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
    validators: [],
  })
  public directDeploy: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
    validators: [],
  })
  public clearBucketForUpload: boolean;

  public async canAccess(context: ServiceContext) {
    // Admins are allowed to access items on any project
    if (context.user?.userRoles.includes(DefaultUserRole.ADMIN)) {
      return true;
    }

    const website: Website = await new Website({}, context).populateById(
      this.website_id,
    );
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        website.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  public async populateDeploymentByCid(cid: string): Promise<this> {
    if (!cid) {
      throw new Error('uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE cid = @cid
      AND status <> ${SqlModelStatus.DELETED}
      AND deploymentStatus = ${DeploymentStatus.SUCCESSFUL}
      ORDER BY createTime DESC
      LIMIT 1;
      `,
      { cid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateLastDeployment(
    website_id: number,
    environment: DeploymentEnvironment,
  ): Promise<this> {
    if (!website_id || !environment) {
      throw new Error('parameters should not be null');
    }

    const environmentCondition =
      environment == DeploymentEnvironment.STAGING
        ? `environment = ${DeploymentEnvironment.STAGING} `
        : ` environment IN (${DeploymentEnvironment.PRODUCTION}, ${DeploymentEnvironment.DIRECT_TO_PRODUCTION}) `;

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE website_id = @website_id
      AND ${environmentCondition}
      AND status <> ${SqlModelStatus.DELETED}
      AND deploymentStatus = ${DeploymentStatus.SUCCESSFUL}
      ORDER BY number DESC
      LIMIT 1;
      `,
      { website_id },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getList(context: ServiceContext, filter: DeploymentQueryFilter) {
    // Map url query with sql fields.
    const fieldMap = {
      id: 'wp.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'd',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields(
          'd',
          '',
          context.getSerializationStrategy(),
        )}, wp.website_uuid
        `,
      qFrom: `
        FROM \`${DbTables.DEPLOYMENT}\` d
        JOIN \`${DbTables.WEBSITE}\` wp ON wp.id = d.website_id
        WHERE wp.website_uuid = @website_uuid
        AND d.status = ${SqlModelStatus.ACTIVE}
        AND (
          @environment IS NULL
          OR d.environment IN (${
            filter.environment == DeploymentEnvironment.PRODUCTION
              ? [
                  DeploymentEnvironment.PRODUCTION,
                  DeploymentEnvironment.DIRECT_TO_PRODUCTION,
                ].join(',')
              : filter.environment
          }
          )
        )
        AND (@deploymentStatus IS NULL OR d.deploymentStatus = @deploymentStatus)
      `,
      qFilter: `
        ORDER BY ${filters.orderStr ? filters.orderStr : 'd.updateTime DESC'}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    const data = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      params,
      'd.id',
    );

    data.items.forEach((item) => {
      if (
        [DeploymentStatus.REJECTED, DeploymentStatus.IN_REVIEW].includes(
          item.deploymentStatus as DeploymentStatus,
        )
      ) {
        item.cid = undefined;
        item.cidv1 = undefined;
        item.size = undefined;
      }
    });

    return data;
  }

  /**
   * Execute deploy or Send message to SQS - depending on the environment
   * @param directDeploy if true and env in [local dev, test], then DeployWebsiteWorker will bi executed directly
   * @param clearBucketForUpload If deployment succeed source bucket will be cleared
   */
  public async deploy() {
    if (
      this.directDeploy &&
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
        deployment_uuid: this.deployment_uuid,
        clearBucketForUpload: this.clearBucketForUpload,
        user_uuid: this.getContext().user?.user_uuid,
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
        this.getContext(),
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor({
        deployment_uuid: this.deployment_uuid,
        clearBucketForUpload: this.clearBucketForUpload,
        user_uuid: this.getContext().user?.user_uuid,
      });
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.DEPLOY_WEBSITE_WORKER,
        [
          {
            deployment_uuid: this.deployment_uuid,
            clearBucketForUpload: this.clearBucketForUpload,
            user_uuid: this.getContext().user?.user_uuid,
          },
        ],
        null,
        null,
      );
    }
  }

  /**
   * Update deployment status, get deployment(hosted on IPFS) screenshot and send message to slack (screenshot + url + approve/reject button)
   * @param website
   * @param user_uuid In workers, context.user is not initialized. So user need to be passed separately.
   */
  public async sendToReview(website: Website, user_uuid: string) {
    //Send website to review
    this.deploymentStatus = DeploymentStatus.IN_REVIEW;

    await this.update();

    //Get IPFS-->IPNS gateway
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: website.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

    //Call url-screenshot lambda/api, to get S3 url link:
    const linkToScreenshot: string = await new UrlScreenshotMicroservice(
      this.getContext(),
    ).getUrlScreenshot(
      website.project_uuid,
      ipfsCluster.generateLink(website.project_uuid, this.cid),
      website.website_uuid,
    );

    console.info('Preparing message for slack...');

    //Send message to slack
    const jwt = generateJwtToken(
      JwtTokenType.WEBSITE_REVIEW_TOKEN,
      { deployment_uuid: this.deployment_uuid },
      JwtExpireTime.NEVER,
    );
    const blocks = [];
    if (linkToScreenshot) {
      blocks.push({
        type: 'image',
        alt_text: linkToScreenshot,
        image_url: linkToScreenshot,
      });
    }
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { text: 'Approve', type: 'plain_text' },
          url: `${env.CONSOLE_API_URL}/storage/hosting/websites/${website.website_uuid}/deployments/${this.deployment_uuid}/approve?token=${jwt}`,
        },
        {
          type: 'button',
          text: { text: 'Reject', type: 'plain_text' },
          url: `${env.CONSOLE_API_URL}/storage/hosting/websites/${website.website_uuid}/deployments/${this.deployment_uuid}/reject?token=${jwt}`,
        },
        {
          type: 'button',
          text: { text: 'Open dashboard', type: 'plain_text' },
          url: `${env.ADMIN_APP_URL}/dashboard/users/${user_uuid}`,
        },
      ],
    });

    const msgParams = {
      message: `
      New website deployment for review.\n
      URL: ${ipfsCluster.generateLink(website.project_uuid, this.cid)} \n
      Project: ${website.project_uuid} \n
      User: ${user_uuid}
      `,
      service: ServiceName.STORAGE,
      blocks,
      channel: env.SLACK_CHANNEL_FOR_WEBSITE_REVIEWS,
    };

    console.info('Sending message to slack...', msgParams);

    await new Lmas().sendMessageToSlack(msgParams);

    await new Lmas().writeLog({
      logType: LogType.INFO,
      project_uuid: website.project_uuid,
      message: 'Website sent to review',
      service: ServiceName.STORAGE,
      data: {
        project_uuid: website.project_uuid,
        deployment: this.serialize(),
      },
    });
  }
}
