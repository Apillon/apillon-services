import {
  Context,
  DeploymentQueryFilter,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  DefaultUserRole,
  CodeException,
  ForbiddenErrorCodes,
  AdvancedSQLModel,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  DbTables,
  DeploymentEnvironment,
  DeploymentStatus,
  StorageErrorCode,
} from '../../../config/types';
import { ServiceContext, getSerializationStrategy } from '@apillon/service-lib';
import { Website } from './website.model';

export class Deployment extends AdvancedSQLModel {
  public readonly tableName = DbTables.DEPLOYMENT;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

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
        code: StorageErrorCode.DEPLOYMENT_WEBSITE_ID_NOT_PRESENT,
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
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DEPLOYMENT_BUCKET_ID_NOT_PRESENT,
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
        code: StorageErrorCode.DEPLOYMENT_ENVIRONMENT_NOT_PRESENT,
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
          getSerializationStrategy(context),
        )}, d.updateTime
        `,
      qFrom: `
        FROM \`${DbTables.DEPLOYMENT}\` d
        JOIN \`${DbTables.WEBSITE}\` wp ON wp.id = d.website_id
        WHERE wp.website_uuid = @website_uuid
        AND d.status = ${SqlModelStatus.ACTIVE}
        AND (
          @environment IS NULL 
          OR d.environment = ${
            filter.environment == DeploymentEnvironment.DIRECT_TO_PRODUCTION
              ? DeploymentEnvironment.PRODUCTION
              : filter.environment
          }
        )
      `,
      qFilter: `
        ORDER BY ${filters.orderStr ? filters.orderStr : 'd.updateTime DESC'}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'd.id');
  }
}
