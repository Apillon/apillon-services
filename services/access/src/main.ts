import { AmsEventType } from 'at-lib';
import { Context } from 'aws-lambda/handler';
import { UserService } from './modules/user/user.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [AmsEventType.USER_LOGIN]: UserService.login,
    [AmsEventType.USER_AUTH]: UserService.isAuthenticated,
  };

  return await processors[event.eventName](event, context);
}
