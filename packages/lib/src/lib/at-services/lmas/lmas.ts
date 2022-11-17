import { env } from '../../../config/env';
import {
  AppEnvironment,
  LmasEventType,
  LogType,
  ServiceName,
} from '../../../config/types';
import { BaseService } from '../base-service';
import { RequestLogDto } from './dtos/request-log.dto';

/**
 * Logging / Monitoring / Alerting Service client
 */
export class Lmas extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.MONITORING_FUNCTION_NAME_TEST
      : env.MONITORING_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.MONITORING_SOCKET_PORT_TEST
      : env.MONITORING_SOCKET_PORT;
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
    try {
      await this.callService(data);
    } catch (err) {
      console.error(`LMAS CALL SERVICE ERROR: ${err.message}`);
    }
  }

  public async writeRequestLog(log: RequestLogDto, securityToken?: string) {
    const data = {
      eventName: LmasEventType.WRITE_REQUEST_LOG,
      log,
    };

    // failsafe logging - without secret!!!
    console.log(JSON.stringify(data));
    // safe attach secret
    data['securityToken'] = securityToken;
    try {
      await this.callService(data);
    } catch (err) {
      console.error(`LMAS CALL SERVICE ERROR: ${err.message}`);
    }
  }
}
