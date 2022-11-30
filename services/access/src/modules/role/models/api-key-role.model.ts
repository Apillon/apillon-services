import {
  AdvancedSQLModel,
  ApiKeyRoleBaseDto,
  CodeException,
  Context,
  DefaultUserRole,
  ForbiddenErrorCodes,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AmsErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '../../../context';

export class ApiKeyRole extends AdvancedSQLModel {
  public readonly tableName = DbTables.API_KEY_ROLE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: integerParser() },
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
        code: AmsErrorCode.API_KEY_ROLE_API_KEY_ID_NOT_PRESENT,
      },
    ],
  })
  public apiKey_id: number;

  @prop({
    parser: { resolver: integerParser() },
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
        code: AmsErrorCode.API_KEY_ROLE_ROLE_ID_NOT_PRESENT,
      },
    ],
  })
  public role_id: number;

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
        code: AmsErrorCode.API_KEY_ROLE_PROJECT_UUID_NOT_PRESENT,
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.API_KEY_ROLE_SERVICE_UUID_NOT_PRESENT,
      },
    ],
  })
  public service_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
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
        code: AmsErrorCode.API_KEY_ROLE_SERVICE_TYPE_ID_NOT_PRESENT,
      },
    ],
  })
  public serviceType_id: number;

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

  public async hasRole(role_id): Promise<boolean> {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE apiKey_id = @apiKey_id
      AND role_id = @role_id
      AND service_uuid = @service_uuid
      AND project_uuid = @project_uuid
      AND status <> ${SqlModelStatus.DELETED};
      `,
      {
        apiKey_id: this.apiKey_id,
        role_id: role_id,
        service_uuid: this.service_uuid,
        project_uuid: this.project_uuid,
      },
    );

    return !!(data && data.length);
  }

  public async deleteApiKeyRole(
    apiKey_id: number,
    apiKeyRole: ApiKeyRoleBaseDto,
  ): Promise<this> {
    const data = await this.getContext().mysql.paramExecute(
      `
      DELETE
      FROM \`${this.tableName}\`
      WHERE apiKey_id = @apiKey_id
      AND role_id = @role_id
      AND service_uuid = @service_uuid
      AND project_uuid = @project_uuid;
      `,
      {
        apiKey_id: apiKey_id,
        role_id: apiKeyRole.role_id,
        service_uuid: apiKeyRole.service_uuid,
        project_uuid: apiKeyRole.project_uuid,
      },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getApiKeyRoles(apiKey_id: number) {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT akr.apiKey_id, akr.role_id, akr.serviceType_id, akr.project_uuid, akr.service_uuid
      FROM \`${this.tableName}\` akr
      WHERE apiKey_id = @apiKey_id
      AND status <> ${SqlModelStatus.DELETED};
      `,
      {
        apiKey_id: apiKey_id,
      },
    );

    if (data && data.length) {
      return data;
    } else {
      return [];
    }
  }
}