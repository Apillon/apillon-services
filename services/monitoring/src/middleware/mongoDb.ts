import { Mongo } from 'at-lib';

const instances = {};

export function MongoDbConnect(options?: {
  connectionString?: string;
  database?: string;
  poolSize?: number;
  instanceName?: string;
  autoDisconnect?: boolean;
}) {
  options = {
    instanceName: 'mongo',
    autoDisconnect: false,
    ...options,
  };

  const before = async (request) => {
    const { context } = request;

    if (!instances[options.instanceName]) {
      const mongo = new Mongo(
        options.connectionString,
        options.database,
        options.poolSize,
      );

      await mongo.connect();
      console.log(
        `Mongo client instance ${options.instanceName} is CONNECTED to server!`,
      );

      instances[options.instanceName] = mongo;
    }

    context[options.instanceName] = instances[options.instanceName];
  };

  const after = async (_response) => {
    if (options.autoDisconnect) {
      try {
        await (instances[options.instanceName] as Mongo).close();
        console.log(
          `Mongo client instance ${options.instanceName} is DISCONNECTED from server!`,
        );
        delete instances[options.instanceName];
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
