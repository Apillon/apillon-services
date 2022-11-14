import {
  ApiKeyQueryFilter,
  CreateApiKeyDto,
  generatePassword,
  SerializeFor,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import { ApiKey } from './models/api-key.model';
import { v4 as uuidV4 } from 'uuid';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import * as bcrypt from 'bcryptjs';
import { AmsErrorCode } from '../../config/types';
import { ApiKeyRole } from '../role/models/api-key-role.model';

export class ApiKeyService {
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
    return true;
  }
  //#endregion
}
