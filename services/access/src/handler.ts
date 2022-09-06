import { Callback, Context, Handler } from 'aws-lambda/handler';
import { UserService } from './user.service';
import { AmsEventType } from 'at-sdk';

export const handler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context);
};

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [AmsEventType.USER_LOGIN]: UserService.login,
    [AmsEventType.USER_AUTH]: UserService.isAuthenticated,
  };

  return await processors[event.eventName](event, context);
}
