import { env } from '../../config/env';
import { LmasEventType, LogType, ServiceName } from '../../config/types';
import { BaseService } from './base-service';

/**
 * Logging / Monitoring / Alerting Service client
 */
export class Lmas extends BaseService {
  lambdaFunctionName = env.AT_LMAS_FUNCTION_NAME;
  devPort = env.AT_LMAS_SOCKET_PORT;
  serviceName = 'LMAS';

  constructor() {
    super();
    this.isDefaultAsync = true;
  }

  public async writeLog(
    params: {
      projectId?: string;
      userId?: string;
      logType?: LogType;
      message?: string;
      location?: string;
      service?: string;
    },
    securityToken?: string,
  ) {
    const data = {
      eventName: LmasEventType.WRITE_LOG,
      projectId: null,
      userId: null,
      logType: LogType.MSG,
      message: '',
      location: null,
      service: ServiceName.GENERAL,
      ...params,
    };

    // failsafe logging - without secret!!!
    console.log(JSON.stringify(data));
    // safe attach secret
    data['securityToken'] = securityToken;

    await this.callService(data);
  }
}
