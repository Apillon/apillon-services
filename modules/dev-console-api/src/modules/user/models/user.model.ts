import { Project } from './../../project/models/project.model';
import { DevConsoleApiContext } from './../../../context';
/* eslint-disable @typescript-eslint/member-ordering */
import { faker } from '@faker-js/faker';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  selectAndCountQuery,
  SerializeFor,
} from '@apillon/lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { UserQueryFilter } from '../../admin-panel/user/dtos/user-query-filter.dto';
import { UUID } from 'crypto';
import { UserProjectsQueryFilter } from '../../admin-panel/user/dtos/user-projects-query-filter.dto';

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

  /** user permissions */
  @prop({
    parser: { resolver: integerParser(), array: true },
    populatable: [],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    defaultValue: [],
  })
  public userPermissions: number[];

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

  public async listAllUsers(filter: UserQueryFilter) {
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
      )}, COUNT(DISTINCT p.id) AS totalProjects, COUNT(s.id) AS totalServices`,
      qFrom: `FROM \`${DbTables.USER}\` u
        JOIN project_user pu ON u.id = pu.user_id
        JOIN project p ON pu.project_id = p.id
        LEFT JOIN service s ON p.id = s.project_id
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

  public async listProjects(user_uuid: UUID, filter: UserProjectsQueryFilter) {
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
}
