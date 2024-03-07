import { Project } from './../../project/models/project.model';
/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  getQueryParams,
  JSONParser,
  PopulateFrom,
  presenceValidator,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { BaseQueryFilter, getFaker } from '@apillon/lib';

/**
 * User model.
 */
export class User extends AdvancedSQLModel {
  /**
   * User's table.
   */
  tableName = DbTables.USER;

  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

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
    fakeValue: () => getFaker().internet.email(),
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
    fakeValue: () => getFaker().name.fullName(),
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
   * Polkadot wallet
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

  /**
   * EVM wallet
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
  public evmWallet: string;

  /** user roles */
  @prop({
    parser: { resolver: integerParser(), array: true },
    populatable: [],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    defaultValue: [],
  })
  public userRoles: number[];

  /** user permissions */
  @prop({
    parser: { resolver: integerParser(), array: true },
    populatable: [],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    defaultValue: [],
  })
  public userPermissions: number[];

  /**
   * Auth user - info property used to pass to microservices - otherwise serialization removes this object
   */
  @prop({
    serializable: [SerializeFor.SERVICE],
  })
  public authUser: any;

  @prop({
    parser: { resolver: JSONParser() },
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
    validators: [],
  })
  public metadata: any;

  public constructor(data?: unknown, context?: Context) {
    super(data, context);
  }

  public override async populateByUUID(user_uuid: string) {
    return super.populateByUUID(user_uuid, 'user_uuid');
  }

  public async getUserDetail(user_uuid: string) {
    const data = await this.db().paramExecute(
      `
        SELECT ${this.generateSelectFields()}
        FROM \`${DbTables.USER}\` u
        WHERE u.user_uuid = @user_uuid
      `,
      { user_uuid },
    );
    return data?.length ? data[0] : data;
  }

  public async listUsers(filter: BaseQueryFilter) {
    const fieldMap = { id: 'u.id' };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'u',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields(
        'u',
      )}, COUNT(DISTINCT p.id) AS totalProjects, COUNT(s.id) AS totalServices, u.createTime, u.updateTime`,
      qFrom: `FROM \`${DbTables.USER}\` u
        LEFT JOIN project_user pu ON u.id = pu.user_id
        LEFT JOIN project p ON pu.project_id = p.id
        LEFT JOIN service s ON p.id = s.project_id
        WHERE (
          @search IS null
          OR u.name LIKE CONCAT('%', @search, '%')
          OR u.email LIKE CONCAT('%', @search, '%')
          OR u.user_uuid = @search
        )
        AND ((@status IS NULL AND u.status <> ${SqlModelStatus.DELETED}) OR @status = u.status)
        `,
      qFilter: `
          ORDER BY ${filters.orderStr || 'u.createTime DESC'}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
      qGroup: `GROUP BY ${this.generateGroupByFields()}`,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      'u.id',
    );
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

  public setUserRolesAndPermissionsFromAmsResponse(amsResponse: any) {
    const data = amsResponse?.data || amsResponse;
    if (data?.authUserRoles) {
      this.userRoles =
        data.authUserRoles
          ?.filter((x) => !x.project_uuid)
          ?.map((x) => x.role_id) || [];

      this.userPermissions = data.authUserRoles
        .filter((x) => !x.project_uuid)
        .map((x) => x.role.rolePermissions)
        .flat()
        .map((rp) => rp.permission_id)
        .filter((value, index, self) => self.indexOf(value) === index);
    }
    return this;
  }

  public setWalletsFromAmsResponse(amsResponse: any) {
    const data = amsResponse?.data || amsResponse;

    this.wallet = data.wallet;
    this.evmWallet = data.evmWallet;
  }

  public async listProjects(user_uuid: string, filter: BaseQueryFilter) {
    const fieldMap = { id: 'u.id' };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'u',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${new Project(
        {},
        this.getContext(),
      ).generateSelectFields('p')}`,
      qFrom: `FROM \`${DbTables.USER}\` u
        JOIN project_user pu ON u.id = pu.user_id
        JOIN project p ON pu.project_id = p.id
        WHERE u.user_uuid = @user_uuid
        AND pu.status <> ${SqlModelStatus.DELETED}
        AND (@search IS null OR p.name LIKE CONCAT('%', @search, '%'))
        `,
      qFilter: `
          ORDER BY ${filters.orderStr || 'u.createTime DESC'}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      { ...params, user_uuid },
      'u.id',
    );
  }

  public async getTotalUsers(): Promise<number> {
    const data = await this.db().paramExecute(
      `
        SELECT COUNT(*) as total
        FROM \`${DbTables.USER}\`
        WHERE status = ${SqlModelStatus.ACTIVE}
      `,
    );
    return data?.length ? data[0].total : 0;
  }
}
