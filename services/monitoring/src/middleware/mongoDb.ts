import { AppEnvironment, env, getEnvSecrets, Mongo } from '@apillon/lib';

const instances = {};

export function MongoDbConnect(
  instanceName = 'mongo',
  autoDisconnect = env.APP_ENV == AppEnvironment.LOCAL_DEV ? false : true,
) {
  const before = async (request) => {
    await getEnvSecrets();

    const options = {
      connectionString:
        env.APP_ENV === AppEnvironment.TEST
          ? env.MONITORING_MONGO_SRV_TEST
          : env.MONITORING_MONGO_SRV,
      database:
        env.APP_ENV === AppEnvironment.TEST
          ? env.MONITORING_MONGO_DATABASE_TEST
          : env.MONITORING_MONGO_DATABASE,
      poolSize: 10,
    };

    console.log(`Starting MongoDB middleware...`);
    console.log(`Params: ${JSON.stringify(options, null, 2)}`);
    const { context } = request;

    if (!instances[instanceName]) {
      const mongo = new Mongo(
        options.connectionString,
        options.database,
        options.poolSize || 10,
      );
      console.log(`Connecting to MongoDB...`);
      await mongo.connect();
      console.log(
        `Mongo client instance ${instanceName} is CONNECTED to server!`,
      );

      instances[instanceName] = mongo;
    }

    context[instanceName] = instances[instanceName];
    console.log(`Mongo client instance ${instanceName} is already connected!`);
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
