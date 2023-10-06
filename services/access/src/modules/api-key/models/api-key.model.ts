import { booleanParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  Context,
  getQueryParams,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  ApiKeyQueryFilterDto,
  ApiKeyRoleBaseDto,
  ProjectAccessModel,
  invalidateCacheKey,
  CacheKeyPrefix,
} from '@apillon/lib';
import { DbTables, AmsErrorCode } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { ApiKeyRole } from '../../role/models/api-key-role.model';
import * as bcrypt from 'bcryptjs';
import { AmsValidationException } from '../../../lib/exceptions';

export class ApiKey extends ProjectAccessModel {
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
    fakeValue: '123456789',
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

  public verifyApiKeySecret(apiKeySecret: string) {
    return (
      typeof apiKeySecret === 'string' &&
      apiKeySecret.length > 0 &&
      bcrypt.compareSync(apiKeySecret, this.apiKeySecret)
    );
  }

  public async assignRole(body: ApiKeyRoleBaseDto) {
    const keyRole: ApiKeyRole = new ApiKeyRole(
      { apiKey_id: this.id, ...body },
      this.getContext(),
    );

    try {
      await keyRole.validate();
    } catch (err) {
      await keyRole.handle(err);
      if (!keyRole.isValid()) {
        throw new AmsValidationException(keyRole);
      }
    }

    //Check if role already assigned
    if (!(await keyRole.hasRole(keyRole.role_id))) {
      await keyRole.insert();
    }

    return keyRole.serialize(SerializeFor.SERVICE);
  }

  public async removeRole(apiKeyRole: ApiKeyRoleBaseDto): Promise<boolean> {
    await this.getContext().mysql.paramExecute(
      `
      DELETE
      FROM \`${DbTables.API_KEY_ROLE}\`
      WHERE apiKey_id = @apiKey_id
      AND role_id = @role_id
      AND service_uuid = @service_uuid
      AND project_uuid = @project_uuid;
      `,
      {
        apiKey_id: this.id,
        role_id: apiKeyRole.role_id,
        service_uuid: apiKeyRole.service_uuid,
        project_uuid: apiKeyRole.project_uuid,
      },
    );

    return true;
  }

  public async removeRolesByService(
    apiKeyRole: ApiKeyRoleBaseDto,
  ): Promise<boolean> {
    await this.getContext().mysql.paramExecute(
      `
      DELETE
      FROM \`${DbTables.API_KEY_ROLE}\`
      WHERE apiKey_id = @apiKey_id
      AND service_uuid = @service_uuid
      AND project_uuid = @project_uuid;
      `,
      {
        apiKey_id: this.id,
        service_uuid: apiKeyRole.service_uuid,
        project_uuid: apiKeyRole.project_uuid,
      },
    );

    return true;
  }

  public async populateByApiKey(apiKey: string): Promise<this> {
    if (!apiKey) {
      throw new Error('apiKey should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE apiKey = @apiKey AND status = ${SqlModelStatus.ACTIVE};
      `,
      { apiKey },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateApiKeyRoles(): Promise<this> {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.API_KEY_ROLE}\`
      WHERE apiKey_id = @id AND status = ${SqlModelStatus.ACTIVE};
      `,
      { id: this.id },
    );

    if (data && data.length) {
      this.apiKeyRoles = [];
      for (const apiKeyRole of data) {
        this.apiKeyRoles.push(new ApiKeyRole(apiKeyRole, this.getContext()));
      }
      return this;
    } else {
      return this;
    }
  }

  public async getList(context: ServiceContext, filter: ApiKeyQueryFilterDto) {
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

  /**
   *
   * @returns number of api key in project
   */
  public async getNumOfApiKeysInProject() {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT COUNT(*) as numOfApiKeys
      FROM \`${this.tableName}\`
      WHERE project_uuid = @project_uuid
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid: this.project_uuid },
    );

    return data[0].numOfApiKeys;
  }

  /**
   * Sets all api keys in project to status blocked/active
   * @param project_uuid
   * @param block true if block, false if unblock
   * @returns
   */
  public async updateApiKeysStatusInProjects(
    project_uuids: string[],
    block: boolean,
  ) {
    const apiKeyRows = await this.getContext().mysql.paramExecute(
      `
      SELECT * FROM \`${this.tableName}\`
      WHERE project_uuid IN (@project_uuids)
      AND status = ${block ? SqlModelStatus.ACTIVE : SqlModelStatus.BLOCKED};
      `,
      { project_uuids },
    );
    const apiKeys = apiKeyRows.map((ak) => ak.apiKey);

    await this.getContext().mysql.paramExecute(
      `
      UPDATE \`${this.tableName}\`
      SET status = ${block ? SqlModelStatus.BLOCKED : SqlModelStatus.ACTIVE}
      WHERE apiKey IN (@apiKeys)
      `,
      { apiKeys },
    );

    for (const apiKey of apiKeys) {
      await invalidateCacheKey(`${CacheKeyPrefix.AUTH_USER_DATA}:${apiKey}`);
    }

    return true;
  }
}
