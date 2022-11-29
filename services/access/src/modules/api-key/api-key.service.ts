import {
  ApiKeyQueryFilter,
  CreateApiKeyDto,
  generatePassword,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import { ApiKey } from './models/api-key.model';
import { v4 as uuidV4 } from 'uuid';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import * as bcrypt from 'bcryptjs';
import { AmsErrorCode } from '../../config/types';
import { ApiKeyRole } from '../role/models/api-key-role.model';

export class ApiKeyService {
  static async getApiKey(
    event: { apiKey: string; apiKeySecret: string },
    context: ServiceContext,
  ) {
    const apiKey: ApiKey = await new ApiKey({}, context).populateByApiKey(
      event.apiKey,
    );

    if (!apiKey.exists() || !apiKey.verifyApiKeySecret(event.apiKeySecret)) {
      throw await new AmsCodeException({
        status: 403,
        code: AmsErrorCode.INVALID_API_KEY,
      }).writeToMonitor({
        user_uuid: context?.user?.user_uuid,
      });
    }

    await apiKey.populateApiKeyRoles();

    return apiKey;
  }

  //#region Api-key CRUD
  static async listApiKeys(
    event: { query: ApiKeyQueryFilter },
    context: ServiceContext,
  ) {
    return await new ApiKey(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new ApiKeyQueryFilter(event.query));
  }

  static async createApiKey(
    event: { body: CreateApiKeyDto },
    context: ServiceContext,
  ): Promise<any> {
    const key: ApiKey = new ApiKey(
      { ...event.body, apiKey: uuidV4() },
      context,
    );

    const apiKeySecret = generatePassword(12);
    key.apiKeySecret = bcrypt.hashSync(apiKeySecret);

    try {
      await key.validate();
    } catch (err) {
      await key.handle(err);
      if (!key.isValid()) throw new AmsValidationException(key);
    }

    const conn = await context.mysql.start();

    try {
      await key.insert(SerializeFor.INSERT_DB, conn);

      //Assign api key roles
      if (event.body.roles) {
        for (const kr of event.body.roles) {
          const akr: ApiKeyRole = new ApiKeyRole(kr, context).populate({
            apiKey_id: key.id,
          });
          try {
            await akr.validate();
          } catch (err) {
            await akr.handle(err);

            if (!akr.isValid()) throw new AmsValidationException(akr);
          }

          await akr.insert(SerializeFor.INSERT_DB, conn);
        }
      }
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }

    await new Lmas().writeLog({
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
    };
  }

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

    await new Lmas().writeLog({
      project_uuid: key.project_uuid,
      logType: LogType.INFO,
      message: 'Api key deleted!',
      user_uuid: context.user.user_uuid,
      location: 'AMS/ApiKeyService/deleteApiKey',
      service: ServiceName.AMS,
    });

    return true;
  }
  //#endregion
}
