import {
  AWS_KMS,
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  env,
  presenceValidator,
  prop,
  safeJsonParse,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, DeployErrorCode } from '../../../config/types';

export class DeploymentConfig extends AdvancedSQLModel {
  public readonly tableName = DbTables.DEPLOYMENT_CONFIG;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
  })
  public repoId: number | null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public repoUrl: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public repoName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.AUTH,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public repoOwnerName: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public hookId: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public branchName: string;

  @prop({
    parser: {
      resolver: stringParser(),
    },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
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
    parser: {
      resolver: integerParser(),
    },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
  })
  public projectConfigId: number;

  @prop({
    parser: {
      resolver: stringParser(),
    },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
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
  })
  public buildCommand: string | null;

  @prop({
    parser: {
      resolver: stringParser(),
    },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public buildDirectory: string;

  @prop({
    parser: {
      resolver: stringParser(),
    },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
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
  })
  public installCommand: string | null;

  @prop({
    parser: {
      resolver: stringParser(),
    },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public apiKey: string;

  @prop({
    parser: {
      resolver: stringParser(),
    },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public apiSecret: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
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
  })
  public encryptedVariables: string | null;

  public async findByRepoId(repoId: number) {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT ${this.generateSelectFields()}
      FROM \`${DbTables.DEPLOYMENT_CONFIG}\`
      WHERE repoId = @repoId
      AND status = ${SqlModelStatus.ACTIVE}`,
      {
        repoId,
      },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async findActiveByProjectConfig(
    projectConfigId: number,
  ): Promise<DeploymentConfig[]> {
    return (
      await this.getContext().mysql.paramExecute(
        `SELECT *
      FROM \`${DbTables.DEPLOYMENT_CONFIG}\`
      WHERE projectConfigId = @projectConfigId
      AND status = ${SqlModelStatus.ACTIVE}`,
        {
          projectConfigId,
        },
      )
    ).map((data) => this.populate(data, PopulateFrom.DB));
  }

  public async findActiveByWebsiteUuid(websiteUuid: string) {
    return (
      await this.getContext().mysql.paramExecute(
        `SELECT *
      FROM \`${DbTables.DEPLOYMENT_CONFIG}\`
      WHERE websiteUuid = @websiteUuid
      AND status = ${SqlModelStatus.ACTIVE}`,
        {
          websiteUuid,
        },
      )
    ).map((data) => this.populate(data, PopulateFrom.DB));
  }

  public async markDeletedByIds(ids: number[]) {
    await this.getContext().mysql.paramExecute(
      `UPDATE \`${DbTables.DEPLOYMENT_CONFIG}\`
      SET status = ${SqlModelStatus.DELETED}
      WHERE id IN (${ids.join(',')})`,
    );
  }

  public async getEnvironmentVariables() {
    if (!this.encryptedVariables) {
      return [];
    }

    const decryptedVariables = await new AWS_KMS().decrypt(
      this.encryptedVariables,
      env.DEPLOY_KMS_KEY_ID,
    );

    return safeJsonParse(decryptedVariables, []);
  }
}
