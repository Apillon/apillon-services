import { CreateApiKeyDto, SerializeFor } from '@apillon/lib';
import { ServiceContext } from '../../context';
import { ApiKey } from './models/api-key.model';
import { v4 as uuidV4 } from 'uuid';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import * as bcrypt from 'bcryptjs';
import { AmsErrorCode } from '../../config/types';

export class ApiKeyService {
  static async createApiKey(
    event: { body: CreateApiKeyDto },
    context: ServiceContext,
  ): Promise<any> {
    const key: ApiKey = new ApiKey(
      { ...event.body, apiKey: uuidV4() },
      context,
    );

    const apiKeySecret = ApiKeyService.generatePassword();
    key.apiKeySecret = bcrypt.hashSync(apiKeySecret);

    try {
      await key.validate();
    } catch (err) {
      await key.handle(err);
      if (!key.isValid()) throw new AmsValidationException(key);
    }

    await key.insert();
    return {
      ...key.serialize(SerializeFor.PROFILE),
      apiKeySecret: apiKeySecret,
    };
  }

  static generatePassword() {
    const length = 12;
    const charset =
      '@#$&*0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$&*0123456789abcdefghijklmnopqrstuvwxyz';
    let password = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
      password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
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
}
