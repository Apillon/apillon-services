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
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
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
