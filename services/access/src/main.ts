import { AmsEventType } from 'at-lib';
import { Context } from 'aws-lambda/handler';
import { AuthUserService } from './modules/auth-user/auth-user.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [AmsEventType.USER_REGISTER]: AuthUserService.register,
    [AmsEventType.USER_LOGIN]: AuthUserService.login,
    [AmsEventType.USER_GET_AUTH]: AuthUserService.getAuthUser,
  };

  return await processors[event.eventName](event, context);
}
