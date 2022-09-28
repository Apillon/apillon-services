import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  uniqueFieldValue,
} from 'at-lib';
import { AmsErrorCode } from '../../config/types';
import * as bcrypt from 'bcrypt';

export class AuthUser extends AdvancedSQLModel {
  tableName: string;

  /**
   * user_uuid
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.USER_UUID_NOT_PRESENT,
      },
      {
        resolver: uniqueFieldValue('authUser', 'user_uuid'),
        code: AmsErrorCode.USER_UUID_ALREADY_EXISTS,
      },
    ],
  })
  public user_uuid: string;

  /**
   * email
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
    setter(v) {
      return v ? v.toLowerCase().replace(' ', '') : v;
    },
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: AmsErrorCode.USER_EMAIL_NOT_VALID,
      },
      {
        resolver: uniqueFieldValue('authUser', 'email'),
        code: AmsErrorCode.USER_EMAIL_ALREADY_TAKEN,
      },
    ],
  })
  public email: string;

  /**
   * User's password hash property
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.INSERT_DB, //
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.USER_PASSWORD_NOT_PRESENT,
      },
    ],
  })
  public password: string;

  /**
   * User's wallet
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.INSERT_DB, //
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      // {
      //   resolver: presenceValidator(),
      //   code: AmsErrorCode.USER_PASSWORD_NOT_PRESENT,
      // },
    ],
  })
  public wallet: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public async populateByUserUuid(user_uuid: string, conn?: PoolConnection) {
    const res = await this.db().paramExecute(
      `
      SELECT * FROM authUser
      WHERE user_uuid = @user_uuid
    `,
      { user_uuid },
      conn,
    );

    //TODO: populate roles

    if (res.length) {
      return this.populate(res[0], PopulateFrom.DB);
    }
    return this.reset();
  }

  public async populateByEmail(email: string, conn?: PoolConnection) {
    const res = await this.db().paramExecute(
      `
      SELECT * FROM authUser
      WHERE email = @email
    `,
      { email },
      conn,
    );

    if (res.length) {
      //TODO: populate roles
      return this.populate(res[0], PopulateFrom.DB);
    }
    return this.reset();
  }

  public verifyPassword(password: string) {
    return (
      typeof password === 'string' &&
      password.length > 0 &&
      bcrypt.compareSync(password, this.password)
    );
  }

  public setPassword(password: string) {
    this.password = bcrypt.hashSync(password, 10);
  }
}
