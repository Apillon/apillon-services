import {
  AdvancedSQLModel,
  BaseQueryFilter,
  CacheKeyPrefix,
  Context,
  DefaultUserRole,
  JSONParser,
  JwtTokenType,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  checkCaptcha,
  env,
  generateJwtToken,
  getQueryParams,
  invalidateCacheKey,
  prop,
  selectAndCountQuery,
  uniqueFieldValue,
} from '@apillon/lib';
import { dateParser, stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import * as bcrypt from 'bcryptjs';
import { AmsErrorCode, DbTables, TokenExpiresInStr } from '../../config/types';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { CryptoHash } from '../../lib/hash-with-crypto';
import { AuthToken } from '../auth-token/auth-token.model';
import { AuthUserRole } from '../role/models/auth-user-role.model';
import { RolePermission } from '../role/models/role-permission.model';
import { Role } from '../role/models/role.model';

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
    defaultValue: [],
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

  /**
   * terms consents
   */
  @prop({
    parser: { resolver: JSONParser() },
    populatable: [
      PopulateFrom.SERVICE, //
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB, //
      SerializeFor.UPDATE_DB,
    ],
  })
  public consents: any;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [
      PopulateFrom.SERVICE, //
      PopulateFrom.DB, //
      PopulateFrom.PROFILE, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public captchaSolveDate: Date;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public async populateByUserUuid(
    user_uuid: string,
    conn?: PoolConnection,
    status: SqlModelStatus = SqlModelStatus.ACTIVE,
  ) {
    const res = await this.db().paramExecute(
      `
      SELECT * FROM authUser
      WHERE user_uuid = @user_uuid
      AND (@status IS NULL OR status = @status)
    `,
      { user_uuid, status },
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
      WHERE email = @email AND status = @status
    `,
      { email, status: SqlModelStatus.ACTIVE },
      conn,
    );

    if (res.length) {
      this.populate(res[0], PopulateFrom.DB);
      await this.populateAuthUserRoles(conn);
      return this;
    }
    return this.reset();
  }

  public async populateByWalletAddress(wallet: string, conn?: PoolConnection) {
    const res = await this.db().paramExecute(
      `
      SELECT * FROM authUser
      WHERE wallet = @wallet
    `,
      { wallet },
      conn,
    );

    if (res.length) {
      this.populate(res[0], PopulateFrom.DB);
      await this.populateAuthUserRoles(conn);
      return this;
    }
    return this.reset();
  }

  public async loginUser() {
    const context = this.getContext();

    const conn = await context.mysql.start();

    // Generate a new token with type USER_AUTH
    this.token = generateJwtToken(JwtTokenType.USER_AUTHENTICATION, {
      user_uuid: this.user_uuid,
    });

    // Create new token in the database
    const authToken = new AuthToken({}, context);
    const tokenData = {
      tokenHash: await CryptoHash.hash(this.token),
      user_uuid: this.user_uuid,
      tokenType: JwtTokenType.USER_AUTHENTICATION,
      expiresIn: TokenExpiresInStr.EXPIRES_IN_1_DAY,
    };

    authToken.populate(tokenData, PopulateFrom.SERVICE);

    try {
      await authToken.validate();
    } catch (err) {
      throw new AmsValidationException(authToken);
    }

    try {
      await this.invalidateOldToken();
      await authToken.insert(SerializeFor.INSERT_DB, conn);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({ user_uuid: this.user_uuid });
    }
  }

  public async logoutUser() {
    try {
      await this.invalidateOldToken();
    } catch (err) {
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({ user_uuid: this.user_uuid });
    }
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
        project_uuid: project_uuid ?? '',
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
      AND (@project_uuid IS NULL OR project_uuid = @project_uuid)
      ;
      `,
      { authUser_id: this.id, role_id, project_uuid: project_uuid || null },
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
        ${new Role({}, this.getContext()).generateSelectFields('r', 'role')},
        ${new RolePermission({}, this.getContext()).generateSelectFields(
          'rp',
          'rolePermission',
        )}
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
        (x) =>
          x.role_id === r.authUserRole__role_id &&
          x.project_uuid == r.authUserRole__project_uuid,
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
        userRole.role.rolePermissions = [];
        this.authUserRoles.push(userRole);
      }

      //Fill role permission
      if (r.rolePermission__permission_id) {
        let permission = userRole.role?.rolePermissions?.find(
          (x) => x.permission_id == r.rolePermission__permission_id,
        );
        if (!permission) {
          permission = new RolePermission(
            {},
            this.getContext(),
          ).populateWithPrefix(r, 'rolePermission', PopulateFrom.DB);

          if (permission.permission_id) {
            userRole.role.rolePermissions.push(permission);
          }
        }
      }
    }

    return this;
  }

  public async listLogins(event: {
    user_uuid: string;
    query: BaseQueryFilter;
  }) {
    const filter = new BaseQueryFilter(event.query);
    const fieldMap = { id: 'at.d' };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'at',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `SELECT createTime as loginDate`,
      qFrom: `FROM \`${DbTables.AUTH_TOKEN}\` at
        WHERE at.user_uuid = @user_uuid`,
      qFilter: `
          ORDER BY ${filters.orderStr || 'at.createTime DESC'}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      { ...params, user_uuid: event.user_uuid },
      'at.id',
    );
  }

  public async listRoles(event: { user_uuid: string; query: BaseQueryFilter }) {
    const filter = new BaseQueryFilter(event.query);
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'aur',
      null,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${new Role({}, this.getContext()).generateSelectFields(
        'r',
      )}`,
      qFrom: `FROM \`${DbTables.AUTH_USER_ROLE}\` aur
        JOIN role r ON aur.role_id = r.id
        WHERE aur.user_uuid = @user_uuid
        AND aur.project_uuid = ''
        AND r.status = ${SqlModelStatus.ACTIVE}
        AND (@search IS null OR r.name LIKE CONCAT('%', @search, '%'))
      `,
      qFilter: `
          ORDER BY ${filters.orderStr}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      { ...params, user_uuid: event.user_uuid },
      'aur.createTime',
    );
  }

  private async invalidateOldToken() {
    // Find and invalidate old token
    const context = this.getContext();
    const oldToken = await new AuthToken({}, context).populateByUserAndType(
      this.user_uuid,
      JwtTokenType.USER_AUTHENTICATION,
    );

    if (!oldToken.exists()) {
      return;
    }
    console.info('Deleting token ...');
    oldToken.status = SqlModelStatus.DELETED;
    await oldToken.update(SerializeFor.UPDATE_DB);
    await invalidateCacheKey(
      `${CacheKeyPrefix.AUTH_USER_DATA}:${this.user_uuid}`,
    );
  }

  public async checkLoginCaptcha(captchaToken: string) {
    const captchaRememberDate = new Date(this.captchaSolveDate);
    captchaRememberDate.setDate(
      captchaRememberDate.getDate() + env.CAPTCHA_REMEMBER_DAYS,
    );

    // If remember date for last captcha solved is in the past, request captcha solve
    if (captchaRememberDate <= new Date()) {
      await checkCaptcha(captchaToken);
    }
    if (captchaToken) {
      await this.populate({ captchaSolveDate: new Date() }).update();
    }
  }
}
