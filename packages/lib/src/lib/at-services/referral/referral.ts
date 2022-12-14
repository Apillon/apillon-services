import { env } from '../../../config/env';
import { AppEnvironment, ReferralEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';

export class ReferralMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.REFERRAL_FUNCTION_NAME_TEST
      : env.REFERRAL_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.REFERRAL_SOCKET_PORT_TEST
      : env.REFERRAL_SOCKET_PORT;
  serviceName = 'LMAS';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  //#region Referral CRUD

  public async createReferral() {
    const data = {
      eventName: ReferralEventType.CREATE_REFERRAL,
    };
    return await this.callService(data);
  }
}
