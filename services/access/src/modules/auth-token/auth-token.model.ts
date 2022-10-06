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
  public user_id: number;

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

  /**
   * Returns instruction instance from instructionEnum
   */
  public async populateByUserUuid(user_uuid: string) {
    const data = await this.db().paramExecute(
      `
            SELECT *
            FROM \`${DbTables.AUTH_TOKEN}\` at
            INNER JOIN \`${DbTables.AUTH_USER}\` au
                ON at.user_id == au.user_id
            WHERE au.user_uuid == @user_uuid
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
