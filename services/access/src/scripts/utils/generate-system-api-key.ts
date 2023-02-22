import {
  AppEnvironment,
  AttachedServiceType,
  CreateApiKeyDto,
  DefaultApiKeyRole,
  env,
  generatePassword,
  MySql,
  SerializeFor,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import { ApiKey } from '../../modules/api-key/models/api-key.model';
import { v4 as uuidV4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { ApiKeyRole } from '../../modules/role/models/api-key-role.model';

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

async function run() {
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

  return { key: key.apiKey, secret: apiKeySecret };
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
  });
