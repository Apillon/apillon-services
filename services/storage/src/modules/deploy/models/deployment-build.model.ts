import {
  AdvancedSQLModel,
  DeploymentBuildStatus,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';

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

  public async handleFailure() {
    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${this.tableName}\`
        SET logs = CONCAT(COALESCE(logs, ''), '\n', 'Deployment failed!!'),
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
