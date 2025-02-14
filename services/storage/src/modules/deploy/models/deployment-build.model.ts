import {
  AdvancedSQLModel,
  DeploymentBuildQueryFilter,
  DeploymentBuildStatus,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';

import { DbTables, StorageErrorCode } from '../../../config/types';

export class DeploymentBuild extends AdvancedSQLModel {
  public readonly tableName = DbTables.DEPLOYMENT_BUILD;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.UPDATE_DB,
    ],
    defaultValue: DeploymentBuildStatus.PENDING,
  })
  public buildStatus: DeploymentBuildStatus;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public logs: string | null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DEPLOYMENT_BUILD_WEBSITE_UUID_NOT_PRESENT,
      },
    ],
  })
  public websiteUuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public finishedTime: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public deploymentUuid: string | null;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public deploymentConfigId: number;

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

  public async listForWebsite(filter: DeploymentBuildQueryFilter) {
    const fieldMap = {
      id: 'b.id',
    };

    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'b',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields()}`,
      qFrom: `FROM ${DbTables.DEPLOYMENT_BUILD} b
        WHERE b.websiteUuid = @websiteUuid
        AND b.status <> ${SqlModelStatus.DELETED}`,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset}`,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      'b.id',
    );
  }

  public async addLog(log: string) {
    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${this.tableName}\`
        SET logs = CONCAT(COALESCE(logs, ''), '\n', @log)
        WHERE id = @id
      `,
      {
        id: this.id,
        log,
      },
    );

    return true;
  }

  public async handleSuccess(deploymentUuid: string) {
    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${this.tableName}\`
        SET logs = CONCAT(COALESCE(logs, ''), '\n', 'Deployment completed successfully'),
        buildStatus = ${DeploymentBuildStatus.SUCCESS},
        finishedTime = NOW(),
        deploymentUuid = @deploymentUuid
        WHERE id = @id
        `,
      {
        id: this.id,
        deploymentUuid,
      },
    );

    return true;
  }

  public async handleFailure(log?: string) {
    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${this.tableName}\`
        SET logs = CONCAT(COALESCE(logs, ''), '\n', '${log ?? 'Deployment failed'}'),
        buildStatus = ${DeploymentBuildStatus.FAILED},
        finishedTime = NOW()
        WHERE id = @id
        `,
      {
        id: this.id,
      },
    );

    return true;
  }
}
