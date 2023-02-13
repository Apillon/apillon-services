import { env } from '../../../config/env';
import { AppEnvironment, AuthenticationEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { VerificationIdentityDto } from './dtos/verify-identity.dto';

export class AuthenticationMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_FUNCTION_NAME_TEST
      : env.STORAGE_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_SOCKET_PORT_TEST
      : env.STORAGE_SOCKET_PORT;
  serviceName = 'AUTHETICATION';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  //#region Authentication
  public async verifyIdentity(params: VerificationIdentityDto) {
    const data = {
      eventName: AuthenticationEventType.IDENTITY_VERIFICATION,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  //#endregion
}
