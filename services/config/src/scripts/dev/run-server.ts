import { AppEnvironment, env } from '@apillon/lib';
import { startDevServer } from '@apillon/service-lib';
import { handler } from '../../handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.CONFIG_SOCKET_PORT_TEST
    : env.CONFIG_SOCKET_PORT;

if (
  [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
    env.APP_ENV as AppEnvironment,
  )
) {
  startDevServer(handler, 'SCS', port);
} else {
  console.log(`SCS: ${env.APP_ENV} - Socket server will not run.`);
}
