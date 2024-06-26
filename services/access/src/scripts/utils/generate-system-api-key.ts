import {
  AppEnvironment,
  AttachedServiceType,
  CreateApiKeyDto,
  DefaultApiKeyRole,
  env,
  generateRandomCode,
  MySql,
  SerializeFor,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ApiKey } from '../../modules/api-key/models/api-key.model';
import { v4 as uuidV4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { ApiKeyRole } from '../../modules/role/models/api-key-role.model';
import { AmsValidationException } from '../../lib/exceptions';

const project_uuid = 'SYSTEM_GENERAL';
const service_uuid = 'SYSTEM_GENERAL_SERVICE';
const name = 'SYSTEM_GENERAL_KEY';
const serviceType_id = AttachedServiceType.SYSTEM;

const options = {
  host:
    env.APP_ENV === AppEnvironment.TEST
      ? env.ACCESS_MYSQL_HOST_TEST
      : env.ACCESS_MYSQL_HOST,
  port:
    env.APP_ENV === AppEnvironment.TEST
      ? env.ACCESS_MYSQL_PORT_TEST
      : env.ACCESS_MYSQL_PORT,
  database:
    env.APP_ENV === AppEnvironment.TEST
      ? env.ACCESS_MYSQL_DATABASE_TEST
      : env.ACCESS_MYSQL_DATABASE,
  user:
    env.APP_ENV === AppEnvironment.TEST
      ? env.ACCESS_MYSQL_USER_TEST
      : env.ACCESS_MYSQL_USER,
  password:
    env.APP_ENV === AppEnvironment.TEST
      ? env.ACCESS_MYSQL_PASSWORD_TEST
      : env.ACCESS_MYSQL_PASSWORD,
};

export async function run() {
  const context = new ServiceContext();
  const mysql = new MySql(options);
  await mysql.connect();
  context.setMySql(mysql);

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

  const apiKeySecret = generateRandomCode(12);
  key.apiKeySecret = bcrypt.hashSync(apiKeySecret);

  await key.validateOrThrow(AmsValidationException);

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

        await akr.validateOrThrow(AmsValidationException);
        await akr.insert(SerializeFor.INSERT_DB, conn);
      }
    }
    await context.mysql.commit(conn);
  } catch (err) {
    await context.mysql.rollback(conn);
    throw err;
  }

  return { key: key.apiKey, secret: apiKeySecret };
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
  });
