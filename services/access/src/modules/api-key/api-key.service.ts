import {
  ApiKeyQueryFilterDto,
  CacheKeyPrefix,
  CreateApiKeyDto,
  invalidateCacheKey,
  Lmas,
  LogType,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  generateRandomCode,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ApiKey } from './models/api-key.model';
import { v4 as uuidV4 } from 'uuid';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import * as bcrypt from 'bcryptjs';
import { AmsErrorCode } from '../../config/types';
import { ApiKeyRole } from '../role/models/api-key-role.model';

/**
 * ApiKeyService class handles API key management, including getting, listing, creating, and deleting API keys.
 */
export class ApiKeyService {
  /**
   * Retrieves an API key based on the provided apiKey and apiKeySecret.
   * @param event An object containing the apiKey and apiKeySecret.
   * @param context The ServiceContext instance for the current request.
   * @returns The ApiKey instance if found and verified.
   */
  static async getApiKey(
    event: { apiKey: string; apiKeySecret: string },
    context: ServiceContext,
  ) {
    const apiKey: ApiKey = await new ApiKey({}, context).populateByApiKey(
      event.apiKey,
    );

    if (!apiKey.exists() || !apiKey.verifyApiKeySecret(event.apiKeySecret)) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.INVALID_API_KEY,
        errorMessage: 'Invalid API key or API key secret',
      }).writeToMonitor({
        user_uuid: context?.user?.user_uuid,
      });
    }

    await apiKey.populateApiKeyRoles();

    return apiKey;
  }

  /**
   * Retreives an API key by ID
   * @param {number} apiKey_id - ID of the api key
   * @param {ServiceContext} context - Service context
   * @returns {Promise<ApiKey>}
   */
  static async getApiKeyById(
    apiKey_id: number,
    context: ServiceContext,
  ): Promise<ApiKey> {
    const key: ApiKey = await new ApiKey({}, context).populateById(apiKey_id);

    if (!key.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.API_KEY_NOT_FOUND,
      }).writeToMonitor({
        context,
        data: { apiKey_id },
      });
    }

    return key;
  }

  //#region Api-key CRUD

  /**
   * Lists API keys based on the provided query.
   * @param event An object containing the query for filtering API keys.
   * @param context The ServiceContext instance for the current request.
   * @returns An array of ApiKey instances that match the given query.
   */
  static async listApiKeys(
    event: { query: ApiKeyQueryFilterDto },
    context: ServiceContext,
  ) {
    return await new ApiKey(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new ApiKeyQueryFilterDto(event.query));
  }

  /**
   * Creates a new API key using the provided data.
   * @param event An object containing the data for creating a new API key.
   * @param context The ServiceContext instance for the current request.
   * @returns An object containing the newly created ApiKey instance and its apiKeySecret.
   */
  static async createApiKey(
    event: { body: CreateApiKeyDto },
    context: ServiceContext,
  ): Promise<any> {
    const key: ApiKey = new ApiKey(
      { ...event.body, apiKey: uuidV4() },
      context,
    );

    const apiKeySecret = generateRandomCode(12);
    key.apiKeySecret = bcrypt.hashSync(apiKeySecret);

    await key.validateOrThrow(AmsValidationException);

    //check max api keys quota
    const numOfApiKeys = await key.getNumOfApiKeysInProject();
    const maxApiKeysQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_API_KEYS,
      project_uuid: key.project_uuid,
    });
    if (maxApiKeysQuota?.value && numOfApiKeys >= maxApiKeysQuota?.value) {
      throw new AmsCodeException({
        code: AmsErrorCode.MAX_API_KEY_QUOTA_REACHED,
        status: 400,
      });
    }

    //Create new api key
    const conn = await context.mysql.start();

    try {
      await key.insert(SerializeFor.INSERT_DB, conn);

      //Assign api key roles
      if (event.body.roles) {
        for (const kr of event.body.roles) {
          const akr: ApiKeyRole = new ApiKeyRole(kr, context).populate({
            apiKey_id: key.id,
          });

          await akr.validateOrThrow(AmsValidationException);
          await akr.insert(SerializeFor.INSERT_DB, conn);
        }
      }
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }

    await new Lmas().writeLog({
      context,
      project_uuid: key.project_uuid,
      logType: LogType.INFO,
      message: 'New api key created!',
      user_uuid: context.user.user_uuid,
      location: 'AMS/ApiKeyService/createApiKey',
      service: ServiceName.AMS,
    });

    return {
      ...key.serialize(SerializeFor.PROFILE),
      apiKeySecret: apiKeySecret,
      apiKeySecretHashed: key.apiKeySecret,
    };
  }

  /**
   * Deletes an API key based on the provided ID.
   * @param event An object containing the ID of the API key to be deleted.
   * @param context The ServiceContext instance for the current request.
   * @returns A boolean value indicating whether the API key was successfully deleted.
   */
  static async deleteApiKey(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const key: ApiKey = await new ApiKey({}, context).populateById(event.id);

    if (!key.exists()) {
      throw new AmsCodeException({
        code: AmsErrorCode.API_KEY_NOT_FOUND,
        status: 404,
      });
    }

    key.canModify(context);

    await key.markDeleted();
    await invalidateCacheKey(`${CacheKeyPrefix.AUTH_USER_DATA}:${key.apiKey}`);

    await new Lmas().writeLog({
      context,
      project_uuid: key.project_uuid,
      logType: LogType.INFO,
      message: 'Api key deleted!',
      user_uuid: context.user.user_uuid,
      location: 'AMS/ApiKeyService/deleteApiKey',
      service: ServiceName.AMS,
    });

    return true;
  }

  static async updateApiKeysInProject(
    event: { project_uuids: string[]; block: boolean },
    context: ServiceContext,
  ): Promise<any> {
    //Update api keys status
    await new ApiKey({}, context).updateApiKeysStatusInProjects(
      event.project_uuids,
      event.block,
    );

    return true;
  }

  //#endregion
}
