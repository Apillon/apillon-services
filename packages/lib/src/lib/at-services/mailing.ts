import { env } from '../../config/env';
import { AppEnvironment, MailEventType } from '../../config/types';
import { Context } from '../context';
import { BaseService } from './base-service';

/**
 * Access Management Service client
 */
export class Mailing extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.MAIL_FUNCTION_NAME_TEST
      : env.MAIL_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.MAIL_SOCKET_PORT_TEST
      : env.MAIL_SOCKET_PORT;
  serviceName = 'MAIL';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = true;
  }

  public async sendMail(params: {
    emails: string[];
    subject: string;
    template: string;
    data?: any;
  }) {
    //TODO: dtos for params
    const data = {
      eventName: MailEventType.SEND_MAIL,
      ...params,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const mailResponse = await this.callService(data);

    return {
      ...mailResponse,
    };
  }
}
