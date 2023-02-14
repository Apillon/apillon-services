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
import { AuthenticationApiContext } from '../../../context';

export class Identity extends AdvancedSQLModel {
  /**
   * User's table.
   */
  tableName = DbTables.IDENTITY;

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

  public async populateByUserEmail(email: string) {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.IDENTITY}\` i
        WHERE i.email = @email
      `,
      { email },
    );
    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }

    return this.reset();
  }

  /**
   * Returns all identities, filtered by specific state
   */
  public async listIdentitiesByState(state: string) {
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
}
