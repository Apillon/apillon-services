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

import { DbTables, DeployErrorCode } from '../../../config/types';

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
      PopulateFrom.WORKER,
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
      PopulateFrom.WORKER,
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
        code: DeployErrorCode.DATA_NOT_PRESENT,
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
      PopulateFrom.WORKER,
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
  public finishedTime: string | null;

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
  public deploymentConfigId: number | null;

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
    console.log('add log, id = ', this.id);
    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${DbTables.DEPLOYMENT_BUILD}\`
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

  public async handleSuccess() {
    console.log('handle success, id = ', this.id);

    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${DbTables.DEPLOYMENT_BUILD}\`
        SET logs = CONCAT(COALESCE(logs, ''), '\n', 'Deployment completed successfully'),
        buildStatus = ${DeploymentBuildStatus.SUCCESS},
        finishedTime = NOW()
        WHERE id = @id
        `,
      {
        id: this.id,
      },
    );

    return true;
  }

  public async handleFailure(log?: string) {
    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${DbTables.DEPLOYMENT_BUILD}\`
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
