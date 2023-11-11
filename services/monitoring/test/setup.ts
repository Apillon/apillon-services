import { AppEnvironment, env, Mongo } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

/**
 * Testing stage definition.
 */

export interface Stage {
  lmasMongo: Mongo;
  context: ServiceContext;
}

export async function setupTest(): Promise<Stage> {
  env.APP_ENV = AppEnvironment.TEST;

  try {
    const lmasMongo = new Mongo(
      env.MONITORING_MONGO_SRV_TEST,
      env.MONITORING_MONGO_DATABASE_TEST,
      10,
    );
    await lmasMongo.connect();

    const context = new ServiceContext();

    return {
      lmasMongo,
      context,
    };
  } catch (e) {
    console.error(e);
    throw new Error('Unable to set up env');
  }
}

/**
 * Releases initialized stage - drops DB and closes SQL connection
 *
 * @param stage Stage with connected DB instance and context instance.
 */
export const releaseStage = async (stage: Stage): Promise<void> => {
  if (!stage) {
    throw new Error('Error - stage does not exist');
  }
  if (stage.lmasMongo) {
    try {
      await stage.lmasMongo.close();
    } catch (error) {
      throw new Error('Error when releasing mongo: ' + error);
    }
  }
};
