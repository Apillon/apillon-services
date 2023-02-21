import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import {
  AttachedServiceType,
  CreateApiKeyDto,
  DefaultApiKeyRole,
  generatePassword,
  SerializeFor,
} from '@apillon/lib';
import { TestContext } from './context';
import { v4 as uuidV4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { ApiKeyRole } from '@apillon/access/src/modules/role/models/api-key-role.model';

export async function generateSystemApiKey(
  context: TestContext,
  params?: {
    project_uuid?: string;
    service_uuid?: string;
    name?: string;
  },
) {
  const project_uuid = params?.project_uuid || 'SYSTEM_GENERAL';
  const service_uuid = params?.service_uuid || 'SYSTEM_GENERAL_SERVICE';
  const name = params?.name || 'SYSTEM_GENERAL_KEY';
  const serviceType_id = AttachedServiceType.SYSTEM;

  const payload = new CreateApiKeyDto({
    project_uuid,
    name,
    roles: [
      {
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid,
        service_uuid,
        serviceType_id,
      },
      {
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid,
        service_uuid,
        serviceType_id,
      },
      {
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid,
        service_uuid,
        serviceType_id,
      },
    ],
  });

  const key: ApiKey = new ApiKey({ ...payload, apiKey: uuidV4() }, context);

  const apiKeySecret = generatePassword(12);
  key.apiKeySecret = bcrypt.hashSync(apiKeySecret);

  try {
    await key.validate();
  } catch (err) {
    await key.handle(err);
    if (!key.isValid()) {
      throw new Error('validation failed');
    }
  }

  //Create new api key
  const conn = await context.mysql.start();

  try {
    await key.insert(SerializeFor.INSERT_DB, conn);

    //Assign api key roles
    if (payload.roles) {
      for (const kr of payload.roles) {
        const akr: ApiKeyRole = new ApiKeyRole(kr, context).populate({
          apiKey_id: key.id,
        });
        try {
          await akr.validate();
        } catch (err) {
          await akr.handle(err);

          if (!akr.isValid()) {
            throw new Error('validation failed');
          }
        }

        await akr.insert(SerializeFor.INSERT_DB, conn);
      }
    }
    await context.mysql.commit(conn);
  } catch (err) {
    await context.mysql.rollback(conn);
    throw err;
  }

  key.apiKeySecret = apiKeySecret;

  return key;
}
