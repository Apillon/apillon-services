import { env } from '../../../config/env';
import { AppEnvironment, SocialEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateSpaceDto } from './dtos/create-space.dto';

export class SocialMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.SOCIAL_FUNCTION_NAME_TEST
      : env.SOCIAL_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.SOCIAL_SOCKET_PORT_TEST
      : env.SOCIAL_SOCKET_PORT;
  serviceName = 'SOCIAL';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  public async createSpace(params: CreateSpaceDto) {
    const data = {
      eventName: SocialEventType.CREATE_SPACE,
      body: params.serialize(),
    };
    return await this.callService(data);
  }
}
