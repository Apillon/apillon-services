/* eslint-disable @typescript-eslint/member-ordering */
import { faker } from '@faker-js/faker';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  presenceValidator,
  SerializeFor,
} from '@apillon/lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';

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
      SerializeFor.SELECT_DB,
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
      SerializeFor.SELECT_DB,
    ],
    fakeValue: () => faker.internet.email(),
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
      SerializeFor.SELECT_DB,
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
    serializable: [],

    fakeValue: '+386 41 885 885',
  })
  public phone: string;

  /*************************************************INFO properties - not part of DB table */

  /**
   * web3 wallet
   * virtual field populated from access service
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.SERVICE, //
    ],
    serializable: [
      SerializeFor.PROFILE, //
      SerializeFor.ADMIN,
    ],
  })
  public wallet: string;

  /** user roles */
  @prop({
    parser: { resolver: integerParser(), array: true },
    populatable: [],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    defaultValue: [],
  })
  public userRoles: number[];

  /**
   * Auth user - info property used to pass to microservices - othervise serialization removes this object
   */
  @prop({
    serializable: [SerializeFor.SERVICE],
  })
  public authUser: any;

  public constructor(data?: unknown, context?: Context) {
    super(data, context);
  }

  public async populateByUUID(user_uuid: string) {
    const data = await this.db().paramExecute(
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

  public async populateByEmail(email: string) {
    const data = await this.db().paramExecute(
      `
        SELECT *
        FROM \`${DbTables.USER}\` u
        WHERE u.email = @email
      `,
      { email },
    );
    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }

  public setUserRolesFromAmsResponse(amsResponse: any) {
    const data = amsResponse?.data || amsResponse;
    if (!data || !data?.authUserRoles) {
      return this;
    }
    this.userRoles =
      data.authUserRoles
        ?.filter((x) => !x.project_uuid)
        ?.map((x) => x.role_id) || [];
    return this;
  }
}
