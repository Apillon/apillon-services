import { BaseSQLModel, PopulateFrom, SerializeFor, prop } from '@apillon/lib';
import { DbTables } from '../../../config/types';
import {
  integerParser,
  stringParser,
  dateParser,
  booleanParser,
} from '@rawmodel/parsers';

/**
 * Used to store one-time passwords for authentication of users.
 */
export class Otp extends BaseSQLModel {
  public readonly tableName = DbTables.OTP;

  public constructor(data: any, context: any) {
    super(data, context);
  }

  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * Email
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
  public email: string;

  /**
   * Code
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
  public code: string;

  /**
   * ExpireTime
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public expireTime: Date;

  /**
   * Used
   */
  @prop({
    parser: { resolver: booleanParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public used: boolean;

  /**
   * Created at
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      // SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      // SerializeFor.ADMIN,
      // SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public createTime?: Date;

  /**
   * Updated at
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      // SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      // SerializeFor.ADMIN,
      // SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;

  /**
   * Tells if the model represents a document stored in the database.
   */
  public exists(): boolean {
    return !!this.id;
  }

  public async populateActiveByEmailAndCode(
    email: string,
    code: string,
  ): Promise<this> {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM ${this.tableName} WHERE email = @email AND CODE = @code AND used = false and expireTime > NOW()`,
      {
        email,
        code,
      },
    );
    data?.length ? this.populate(data[0], PopulateFrom.DB) : this.reset();

    return this;
  }
}
