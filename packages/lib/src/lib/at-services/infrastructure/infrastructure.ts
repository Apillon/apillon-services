import { env } from '../../../config/env';
import { AppEnvironment } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';

export class InfrastructureMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.INFRASTRUCTURE_FUNCTION_NAME_TEST
      : env.INFRASTRUCTURE_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.INFRASTRUCTURE_SOCKET_PORT_TEST
      : env.INFRASTRUCTURE_SOCKET_PORT;
  serviceName: 'INFRASTRUCTURE';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }
}
