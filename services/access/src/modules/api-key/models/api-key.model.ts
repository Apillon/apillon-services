import { booleanParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  CodeException,
  Context,
  DefaultUserRole,
  ForbiddenErrorCodes,
  getQueryParams,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  ApiKeyQueryFilter,
} from '@apillon/lib';
import { DbTables, AmsErrorCode } from '../../../config/types';
import { ServiceContext } from '../../../context';
import { ApiKeyRole } from '../../role/models/api-key-role.model';

export class ApiKey extends AdvancedSQLModel {
  public readonly tableName = DbTables.API_KEY;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.API_KEY_NOT_PRESENT,
      },
    ],
  })
  public apiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.API_KEY_SECRET_NOT_PRESENT,
      },
    ],
  })
  public apiKeySecret: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.API_KEY_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public name: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
    defaultValue: false,
    fakeValue: false,
  })
  public testNetwork: boolean;

  /**
   * apiKey roles
   */
  @prop({
    parser: { resolver: ApiKeyRole, array: true },
    populatable: [
      PopulateFrom.SERVICE, //
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public apiKeyRoles: ApiKeyRole[];

  public canAccess(context: ServiceContext) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissins',
      });
    }
  }

  public canModify(context: ServiceContext) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissins',
      });
    }
  }

  public async getList(context: ServiceContext, filter: ApiKeyQueryFilter) {
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'ak.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'ak',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('ak', '')}, ak.updateTime
        `,
      qFrom: `
        FROM \`${DbTables.API_KEY}\` ak
        WHERE ak.project_uuid = @project_uuid
        AND (@search IS null OR ak.name LIKE CONCAT('%', @search, '%'))
        AND status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'ak.id');
  }
}
