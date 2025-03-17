import { stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { DbTables, DeployErrorCode } from '../../../config/types';

export class GithubProjectConfig extends AdvancedSQLModel {
  public readonly tableName = DbTables.GITHUB_PROJECT_CONFIG;

  @prop({
    parser: {
      resolver: stringParser(),
    },
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
        code: DeployErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public refresh_token: string | null;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public access_token: string;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public username: string;

  public async populateByWebsiteUuid(websiteUuid: string) {
    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT c.*
      FROM \`${DbTables.GITHUB_PROJECT_CONFIG}\` c
      JOIN \`${DbTables.DEPLOYMENT_CONFIG}\` dc ON c.id = dc.projectConfigId
      WHERE  dc.websiteUuid = @websiteUuid 
      AND dc.status <> ${SqlModelStatus.DELETED}
      `,
      {
        websiteUuid,
      },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByProjectUuid(
    projectUuid: string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!projectUuid) {
      throw new Error('Project UUID should be provided');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM ${DbTables.GITHUB_PROJECT_CONFIG}
      WHERE project_uuid = @projectUuid`,
      {
        projectUuid,
      },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
