import { getEnvSecrets, MySql } from '@apillon/lib';
const instances = {};
/**
 * MySQL middleware
 * @param connectionParams parameters for database connection
 * @param instanceName name of the instance - supported multiple db instance configuration
 * @param autoDisconnect should connection terminate on finished request
 * @returns database connection on context object
 */
export function MySqlConnect(
  getConnectionParams: () => {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  },
  instanceName = 'mysql',
  autoDisconnect = true,
) {
  const before = async (request) => {
    // console.log(request);
    const { context } = request;
    await getEnvSecrets();

    if (!instances[instanceName]) {
      const mysql = new MySql(getConnectionParams());

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
        await (instances[instanceName] as MySql)?.close();
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
