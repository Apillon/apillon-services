import { Context, SqlModelStatus } from '@apillon/lib';
import {
  AdvancedSQLModel,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { AuthenticationErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class Identity extends AdvancedSQLModel {
  /**
   * User's table.
   */
  public readonly tableName = DbTables.IDENTITY;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * Identity email
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.IDENTITY_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public email: string;

  /**
   * Identity didUri
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public didUri: string;

  /**
   * Identity credential
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public credential: string;

  /**
   * Identity credential
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.IDENTITY_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;

  /**
   * Identity state as defined in types
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.IDENTITY_STATE_NOT_PRESENT,
      },
    ],
  })
  public state: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public project_uuid: string;

  /**
   * Sets identity state
   */
  public async setState(state: string, update = true) {
    this.state = state;
    if (update) {
      await this.update();
    }
  }

  public async populateByUserEmail(context: ServiceContext, email: string) {
    const data = await this.getContext().mysql.paramExecute(
      `
          SELECT *
          FROM \`${DbTables.IDENTITY}\` i
          WHERE i.email = @email
        `,
      { email },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   * Returns all identities, filtered by specific state
   */
  public async listIdentitiesByState(context: ServiceContext, state: string) {
    const params = { state };
    const sqlQuery = {
      qSelect: `
          SELECT ${this.generateSelectFields('i', '', SerializeFor.SELECT_DB)}
          `,
      qFrom: `
          FROM ${DbTables.IDENTITY} i
          WHERE i.state = @state
          `,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      'i.id',
    );
  }

  /**
   * Get total identity count for project and email
   * @param {string} project_uuid
   * @param {string} email
   * @returns count of identities
   */
  public async getIdentitiesCount(
    project_uuid: string,
    email: string,
  ): Promise<number> {
    if (!project_uuid || !email) {
      throw new Error('project_uuid or email should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT COUNT(*) as identityCount
      FROM \`${DbTables.IDENTITY}\`
      WHERE project_uuid = @project_uuid
      OR email = @email
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid, email },
    );

    return data?.length ? data[0].identityCount : 0;
  }
}
