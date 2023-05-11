import { AppEnvironment, env, getEnvSecrets, Mongo } from '@apillon/lib';

const instances = {};

export function MongoDbConnect(
  getConnectionParams: () => {
    connectionString: string;
    database: string;
    poolSize?: number;
  },
  instanceName = 'mongo',
  autoDisconnect = env.APP_ENV == AppEnvironment.LOCAL_DEV ? false : true,
) {
  const before = async (request) => {
    console.log(`Starting MongoDB middleware...`);

    const { context } = request;
    await getEnvSecrets();
    const connectionParams = getConnectionParams();

    if (!instances[instanceName]) {
      const mongo = new Mongo(
        connectionParams.connectionString,
        connectionParams.database,
        connectionParams.poolSize || 10,
      );
      console.log(`Connecting to MongoDB...`);
      await mongo.connect();
      console.log(
        `Mongo client instance ${instanceName} is CONNECTED to server!`,
      );

      instances[instanceName] = mongo;
    } else {
      console.log(
        `Mongo client instance ${instanceName} is already connected!`,
      );
    }

    context[instanceName] = instances[instanceName];
  };

  const after = async (_response) => {
    if (autoDisconnect) {
      try {
        await (instances[instanceName] as Mongo).close();
        console.log(
          `Mongo client instance ${instanceName} is DISCONNECTED from server!`,
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
