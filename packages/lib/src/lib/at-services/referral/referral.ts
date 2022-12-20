import { env } from '../../../config/env';
import { AppEnvironment, ReferralEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateReferralDto } from './dtos/create-referral.dto';

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

  public async createReferral(params: CreateReferralDto) {
    const data = {
      eventName: ReferralEventType.CREATE_REFERRAL,
      body: params.serialize(),
    };
    return await this.callService(data);
  }
}
