import { dateParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  prop,
  SerializeFor,
} from 'at-lib';
import { DbTables } from '../../config/types';

export class AuthToken extends AdvancedSQLModel {
  public readonly tableName = DbTables.AUTH_TOKEN;

  public constructor(data: any, context: Context) {
    super(data, context);
  }
  /**
   * Token
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public token: string;

  /**
   * AuthUser ID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public user_uuid: string;

  /**
   * Expires at
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public expiresAt?: Date;

  public isTokenValid(token: AuthToken) {
    // if(token.expiresAt < expiration_date) {
    //   return false;
    // }

    return true;
  }

  /**
   * Returns instruction instance from instructionEnum
   */
  public async populateByUserUuid(user_uuid: string) {
    const data = await this.db().paramExecute(
      `
            SELECT *
            FROM \`${DbTables.AUTH_TOKEN}\` at
            WHERE at.user_uuid == @user_uuid
            LIMIT 1
        `,
      { user_uuid },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }
}
