import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';

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
  public repoId: number;

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
  })
  public websiteUuid: string;

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
  })
  public accessToken: string;

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
    ],
  })
  public apiSecret: string;

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
}
