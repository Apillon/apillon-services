import { AppEnvironment, env } from '@apillon/lib';
import { startDevServer } from '@apillon/service-lib';
import { handler } from '../../handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.INFRASTRUCTURE_SOCKET_PORT_TEST
    : env.INFRASTRUCTURE_SOCKET_PORT;

if (
  [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
    env.APP_ENV as AppEnvironment,
  )
) {
  startDevServer(handler, 'INFRASTRUCTURE', port);
} else {
  console.log(`INFRASTRUCTURE: ${env.APP_ENV} - Socket server will not run.`);
}
