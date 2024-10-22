import { AppEnvironment, env } from '@apillon/lib';
import { startDevServer } from '@apillon/service-lib';
import { handler } from '../../handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.ASSET_MANAGEMENT_SOCKET_PORT_TEST
    : env.ASSET_MANAGEMENT_SOCKET_PORT;

if (
  [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
    env.APP_ENV as AppEnvironment,
  )
) {
  startDevServer(handler, 'ASSET_MANAGEMENT', port);
} else {
  console.log(`ASSET_MANAGEMENT: ${env.APP_ENV} - Socket server will not run.`);
}
