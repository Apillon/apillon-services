import { env } from '../../../config/env';
import { AppEnvironment, MailEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { EmailDataDto } from './dto/email-data.dto';

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

  constructor(context?: Context) {
    super(context);
    this.isDefaultAsync = true;
  }

  public async sendMail(emailData: EmailDataDto) {
    const data = {
      eventName: MailEventType.SEND_MAIL,
      emailData: emailData.serialize(),
    };

    const mailResponse = await this.callService(data);

    return {
      ...mailResponse,
    };
  }

  public async sendCustomMail(emailData: EmailDataDto) {
    const data = {
      eventName: MailEventType.SEND_CUSTOM_MAIL,
      emailData: emailData.serialize(),
    };

    const mailResponse = await this.callService(data);

    return {
      ...mailResponse,
    };
  }

  public async setMailerliteField(field: string, value: any) {
    return await this.callService({
      eventName: MailEventType.SET_MAILERLITE_FIELD,
      field,
      value,
    });
  }
}
