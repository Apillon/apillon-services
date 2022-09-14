import { MySql } from 'at-lib';
const instances = {};

export function MySqlConnect(options?: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  instanceName?: string;
  autoDisconnect?: boolean;
}) {
  options = {
    instanceName: 'mysql',
    autoDisconnect: false,
    ...options,
  };

  const before = async (request) => {
    const { context } = request;

    if (!instances[options.instanceName]) {
      const mysql = new MySql(options);

      await mysql.connect();
      console.log(
        `MySQL client instance ${options.instanceName} is CONNECTED to server!`,
      );

      instances[options.instanceName] = mysql;
    }

    context[options.instanceName] = instances[options.instanceName];
  };

  const after = async (_response) => {
    if (options.autoDisconnect) {
      try {
        await (instances[options.instanceName] as MySql).close();
        console.log(
          `MySQL client instance ${options.instanceName} is DISCONNECTED from server!`,
        );
      } catch (err) {
        console.error(err);
        console.log(
          `ERROR: Instance ${options.instanceName} could not disconnect from server!`,
        );
      }
    }
  };

  return { before, after };
}
