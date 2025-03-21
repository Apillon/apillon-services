import { AppEnvironment, env } from '@apillon/lib';
import { startDevServer } from '@apillon/service-lib';
import { handler } from '../../handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.DEPLOY_SOCKET_PORT_TEST
    : env.DEPLOY_SOCKET_PORT;

if (
  [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
    env.APP_ENV as AppEnvironment,
  )
) {
  startDevServer(handler, 'DEPLOY', port);
} else {
  console.log(`DEPLOY: ${env.APP_ENV} - Socket server will not run.`);
}
