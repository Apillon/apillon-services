import { AppEnvironment, env } from '@apillon/lib';
import { startDevServer } from '../../server';

if (
  [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
    env.APP_ENV as AppEnvironment,
  )
) {
  startDevServer();
} else {
  console.log(`AMS: ${env.APP_ENV} - Socket server will not run.`);
}
