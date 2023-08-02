import { env } from '../../../config/env';
import {
  AppEnvironment,
  LmasEventType,
  LogType,
  ServiceName,
} from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { LogsQueryFilter } from './dtos/logs-query-filter.dto';
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
    this.defaultQueueUrl = env.MONITORING_SQS_URL;
  }

  public async writeLog(params: {
    context?: Context;
    /**
     * Nullable if context is present - user is by default taken from context
     */
    user_uuid?: string;
    project_uuid?: string;
    logType?: LogType;
    message?: string;
    location?: string;
    service?: string;
    data?: any;
  }) {
    // hide some data from logging
    if (!!params.data?.password) {
      params.data.password = '******';
    }

    //// if we want to anonymize email
    // if (!!params.data?.email) {
    //   params.data.email = params.data.email.replace(
    //     /(\w{1})[\w.-\\+]+(\w{1})@([\w.]+\w)/,
    //     '$1***$2@$3',
    //   );
    // }

    const data = {
      requestId: params.context?.requestId || null,
      eventName: LmasEventType.WRITE_LOG,
      project_uuid: params.project_uuid || null,
      user_uuid: params?.user_uuid || params?.context?.user?.user_uuid || null,
      logType: params.logType || LogType.MSG,
      message: params.message || '',
      location: params.location || null,
      service: params.service || ServiceName.GENERAL,
      data: params.data || null,
    };

    console.log(JSON.stringify(data));

    try {
      await this.callService(data);
    } catch (err) {
      console.error(`LMAS writeLog CALL SERVICE ERROR: ${err.message}`);
    }
  }

  public async writeRequestLog(log: RequestLogDto) {
    const data = {
      eventName: LmasEventType.WRITE_REQUEST_LOG,
      log: log.serialize(),
    };

    // console.log(JSON.stringify(data));

    try {
      await this.callService(data);
    } catch (err) {
      console.error(`LMAS writeRequestLog CALL SERVICE ERROR: ${err.message}`);
    }
  }

  public async sendAdminAlert(
    message: string,
    serviceName: ServiceName,
    level: 'message' | 'warning' | 'alert',
  ) {
    const data = {
      eventName: LmasEventType.SEND_ADMIN_ALERT,
      message,
      level,
      serviceName,
    };

    // console.log(JSON.stringify(data));

    try {
      await this.callService(data);
    } catch (err) {
      console.error(`LMAS sendAdminAlert CALL SERVICE ERROR: ${err.message}`);
    }
  }

  public async listMongoLogs(query: LogsQueryFilter) {
    return await this.callService(
      { eventName: LmasEventType.LIST_LOGS, query },
      { isAsync: false },
    );
  }
}
