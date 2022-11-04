/* eslint-disable @typescript-eslint/member-ordering */
import { faker } from '@faker-js/faker';
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
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_UUID_NOT_PRESENT,
      },
    ],
  })
  public user_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public email: string;

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
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    fakeValue: () => faker.name.fullName(),
  })
  public name: string;

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

  /**
   * Auth user - info property used to pass to microservices - othervise serialization removes this object
   */
  @prop({
    serializable: [SerializeFor.SERVICE],
  })
  public authUser: any;

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
