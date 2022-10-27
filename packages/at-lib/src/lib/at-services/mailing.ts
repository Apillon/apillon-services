import { env } from '../../config/env';
import { AppEnvironment, MailEventType } from '../../config/types';
import { BaseService } from './base-service';

/**
 * Access Management Service client
 */
export class Mailing extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AT_MAIL_FUNCTION_NAME_TEST
      : env.AT_MAIL_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AT_MAIL_SOCKET_PORT_TEST
      : env.AT_MAIL_SOCKET_PORT;
  serviceName = 'MAIL';
  private securityToken: string;

  constructor() {
    super();
    this.isDefaultAsync = false;
    this.securityToken = this.generateSecurityToken();
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
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const mailResponse = await this.callService(data);

    return {
      ...mailResponse,
    };
  }

  private generateSecurityToken() {
    // NOTE - Rename as not to be confused with JwtUtils().generateToken
    // NOTE2 - This should probably be a util function somewhere outside this file?
    //TODO - generate JWT from APP secret
    return 'SecurityToken';
  }
}
