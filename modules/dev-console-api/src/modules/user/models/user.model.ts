/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  PopulateFrom,
  presenceValidator,
  SerializeFor,
} from 'at-lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';

/**
 * User model.
 */
export class User extends AdvancedSQLModel {
  /**
   * User's table.
   */
  tableName = DbTables.USER;

  /**
   * User's name (first name + last name) property definition.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    fakeValue: 'John Snow',
  })
  public name: string;

  /**
   * User's UUID used for synchronization with microservices
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.INSERT_DB, //
      SerializeFor.ADMIN,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_UUID_NOT_PRESENT,
      },
    ],
  })
  public user_uuid: string;

  /**
   * Phone number
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

    fakeValue: '+386 41 885 885',
  })
  public phone: string;

  public async populateByUUID(
    context: DevConsoleApiContext,
    user_uuid: string,
  ) {
    const data = await context.mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.USER}\` u
        WHERE u.user_uuid = @user_uuid
      `,
      { user_uuid },
    );
    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }
}
// /**
//  * email
//  */
// @prop({
//   parser: { resolver: stringParser() },
//   populatable: [
//     PopulateFrom.DB, //
//     PopulateFrom.SERVICE,
//   ],
//   serializable: [
//     SerializeFor.ADMIN,
//     SerializeFor.INSERT_DB,
//     SerializeFor.SERVICE,
//   ],
//   setter(v) {
//     return v ? v.toLowerCase().replace(' ', '') : v;
//   },
//   validators: [
//     {
//       resolver: presenceValidator(),
//       code: ValidatorErrorCode.USER_EMAIL_NOT_PRESENT,
//     },
//     {
//       resolver: emailValidator(),
//       code: ValidatorErrorCode.USER_EMAIL_NOT_VALID,
//     },
//     {
//       resolver: uniqueFieldValue('user', 'email'),
//       code: ValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
//     },
//   ],
// })
// public email: string;
