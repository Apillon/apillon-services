import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  DefaultUserRole,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
  uniqueFieldValue,
} from 'at-lib';
import { AmsErrorCode, DbTables } from '../../config/types';
import * as bcrypt from 'bcryptjs';
import { Role } from '../role/models/role.model';
import { AuthUserRole } from '../role/models/auth-user-role.model';

export class AuthUser extends AdvancedSQLModel {
  public readonly tableName = DbTables.AUTH_USER;

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

  /**
   * auth user roles
   */
  @prop({
    parser: { resolver: AuthUserRole, array: true },
    populatable: [
      PopulateFrom.SERVICE, //
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public authUserRoles: AuthUserRole[];

  /**
   * auth user token
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.SERVICE, //
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public token: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public async populateByUserUuid(user_uuid: string, conn?: PoolConnection) {
    const res = await this.db().paramExecute(
      `
      SELECT * FROM authUser
      WHERE user_uuid = @user_uuid
      AND status = @status
    `,
      { user_uuid, status: SqlModelStatus.ACTIVE },
      conn,
    );

    if (res.length) {
      this.populate(res[0], PopulateFrom.DB);
      await this.populateAuthUserRoles(conn);
      return this;
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
      this.populate(res[0], PopulateFrom.DB);
      await this.populateAuthUserRoles(conn);
      return this;
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

  public async setDefaultRole(conn: PoolConnection) {
    await this.assignRole('', DefaultUserRole.USER, conn);
  }

  public async assignRole(
    project_uuid: string,
    role_id: number,
    conn?: PoolConnection,
  ) {
    await this.db().paramExecute(
      `
      INSERT INTO ${DbTables.AUTH_USER_ROLE} 
      (authUser_id, role_id, user_uuid, project_uuid)
      VALUES (@authUser_id, @role_id, @user_uuid, @project_uuid)
      `,
      {
        authUser_id: this.id,
        role_id,
        user_uuid: this.user_uuid,
        project_uuid,
      },
      conn,
    );
    await this.populateAuthUserRoles(conn);
    return this;
  }

  public async removeRole(
    project_uuid: string,
    role_id: number,
    conn?: PoolConnection,
  ) {
    await this.db().paramExecute(
      `
      DELETE FROM ${DbTables.AUTH_USER_ROLE} 
      WHERE authUser_id = @authUser_id
      AND role_id = @role_id
      AND project_uuid = @project_uuid
      ;
      `,
      { authUser_id: this.id, role_id, project_uuid },
      conn,
    );
    await this.populateAuthUserRoles(conn);
    return this;
  }

  public async populateAuthUserRoles(conn?: PoolConnection) {
    this.authUserRoles = [];
    const res = await this.db().paramExecute(
      `
      SELECT
        ${new AuthUserRole({}, this.getContext()).generateSelectFields(
          'aur',
          'authUserRole',
        )},
        ${new Role({}, this.getContext()).generateSelectFields('r', 'role')}
        ` +
        //${new RolePermission({}, this.getContext()).generateSelectFields(
        //   'rp',
        //   'rolePermission',
        // )},
        `
      FROM ${DbTables.AUTH_USER_ROLE} aur
      JOIN ${DbTables.ROLE} r
      ON r.id = aur.role_id
      LEFT JOIN ${DbTables.ROLE_PERMISSION} rp
      ON rp.role_id = r.id
      WHERE aur.authUser_id = @authUserId
      ORDER BY r.id;
    `,
      { authUserId: this.id },
      conn,
    );

    for (const r of res) {
      let userRole = this.authUserRoles.find(
        (x) => x.role_id === r.userRole__role_id,
      );
      if (!userRole) {
        userRole = new AuthUserRole({}, this.getContext()).populateWithPrefix(
          r,
          'authUserRole',
          PopulateFrom.DB,
        );

        userRole.role = new Role({}, this.getContext()).populateWithPrefix(
          r,
          'role',
          PopulateFrom.DB,
        );
        this.authUserRoles = [...this.authUserRoles, userRole];
      }

      // let permission = userRole.role.rolePermissions.find(
      //   (x) => x.permission_id == r.rolePermission__permission_id,
      // );
      // if (!permission) {
      //   permission = new RolePermission(
      //     {},
      //     this.getContext(),
      //   ).populateWithPrefix(r, 'rolePermission', PopulateFrom.DB);

      //   if (permission.permission_id) {
      //     userRole.role.rolePermissions = [
      //       ...userRole.role.rolePermissions,
      //       permission,
      //     ];
      //   }
      // }
    }

    return this;
  }
}
