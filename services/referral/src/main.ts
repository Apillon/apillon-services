import { ReferralEventType } from '@apillon/lib';
import { Context } from 'aws-lambda/handler';
import { ReferralService } from './modules/referral/referral.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [ReferralEventType.CREATE_REFERRAL]: ReferralService.createReferral,
  };

  return await processors[event.eventName](event, context);
}
