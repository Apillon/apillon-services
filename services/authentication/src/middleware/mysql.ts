import { AppEnvironment, env, getEnvSecrets, MySql } from '@apillon/lib';
const instances = {};

export function MySqlConnect(instanceName = 'mysql', autoDisconnect = true) {
  const before = async (request) => {
    await getEnvSecrets();

    const options = {
      host:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AUTH_API_MYSQL_HOST_TEST
          : env.AUTH_API_MYSQL_HOST,
      port:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AUTH_API_MYSQL_PORT_TEST
          : env.AUTH_API_MYSQL_PORT,
      database:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AUTH_API_MYSQL_DATABASE_TEST
          : env.AUTH_API_MYSQL_DATABASE,
      user:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AUTH_API_MYSQL_USER_TEST
          : env.AUTH_API_MYSQL_USER,
      password:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AUTH_API_MYSQL_PASSWORD_TEST
          : env.AUTH_API_MYSQL_PASSWORD,
    };

    const { context } = request;

    if (!instances[instanceName]) {
      const mysql = new MySql(options);

      await mysql.connect();
      console.log(
        `MySQL client instance ${instanceName} is CONNECTED to server!`,
      );

      instances[instanceName] = mysql;
    }

    context.serviceContext[instanceName] = instances[instanceName];
  };

  const after = async (_response) => {
    if (autoDisconnect) {
      try {
        await (instances[instanceName] as MySql).close();
        console.log(
          `MySQL client instance ${instanceName} is DISCONNECTED from server!`,
        );
        delete instances[instanceName];
      } catch (err) {
        console.error(err);
        console.log(
          `ERROR: Instance ${instanceName} could not disconnect from server!`,
        );
      }
    }
  };

  const onError = after;

  return { before, after, onError };
}
