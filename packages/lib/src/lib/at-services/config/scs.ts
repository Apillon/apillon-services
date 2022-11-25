import { env } from '../../../config/env';
import { AppEnvironment, ScsEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { GetQuotaDto } from './dtos/get-quota.dto';

/**
 * System config Service client
 */
export class Scs extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_FUNCTION_NAME_TEST
      : env.CONFIG_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_SOCKET_PORT_TEST
      : env.CONFIG_SOCKET_PORT;
  serviceName = 'SCS';

  user: any;

  constructor(context?: Context) {
    super();
    this.isDefaultAsync = false;
    if (context) {
      this.user = context.user;
    }
  }

  public async getQuota(params: GetQuotaDto) {
    const data = {
      eventName: ScsEventType.GET_QUOTA,
      ...params.serialize(),
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const scsResponse = await this.callService(data);

    return {
      ...scsResponse,
    };
  }
}
