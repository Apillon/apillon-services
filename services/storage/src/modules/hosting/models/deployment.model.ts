import {
  AccessControlModel,
  Context,
  DeploymentQueryFilter,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  DbTables,
  DeploymentEnvironment,
  DeploymentStatus,
  StorageErrorCode,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Website } from './website.model';

export class Deployment extends AccessControlModel {
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
      SerializeFor.SELECT_DB,
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
    ],
    validators: [],
  })
  public cid: string;

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
    ],
    validators: [],
  })
  public number: number;

  public async canAccess(context: ServiceContext) {
    const website: Website = await new Website({}, context).populateById(
      this.website_id,
    );
    return super.canAccess(context, website.project_uuid);
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

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
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

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getList(context: ServiceContext, filter: DeploymentQueryFilter) {
    await this.canAccess(context);
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
        SELECT ${this.generateSelectFields('d', '')}, d.updateTime
        `,
      qFrom: `
        FROM \`${this.tableName}\` d
        JOIN \`${DbTables.WEBSITE}\` wp ON wp.id = d.website_id
        WHERE wp.id = @website_id
        AND d.status = ${SqlModelStatus.ACTIVE}
        AND (@environment IS NULL OR d.environment = @environment)
      `,
      qFilter: `
        ORDER BY ${filters.orderStr ? filters.orderStr : 'd.updateTime DESC'}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'd.id');
  }
}
