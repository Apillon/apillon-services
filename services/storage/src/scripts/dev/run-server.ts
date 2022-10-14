import { AppEnvironment, env } from 'at-lib';
import { startDevServer } from '../../server';

if (
  [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
    env.APP_ENV as AppEnvironment,
  )
) {
  startDevServer();
} else {
  console.log(`LMAS: ${env.APP_ENV} - Socket server will not run.`);
}
