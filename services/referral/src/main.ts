import { ReferralEventType } from '@apillon/lib';
import { Context } from 'aws-lambda/handler';
import { ReferralService } from './modules/referral/referral.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [ReferralEventType.CREATE_REFERRAL]: ReferralService.createReferral,
    [ReferralEventType.GET_REFERRAL]: ReferralService.getReferral,
    [ReferralEventType.GET_TWEETS]: ReferralService.getTweets,
    [ReferralEventType.GET_TWITTER_LINK]:
      ReferralService.getTwitterAuthenticationLink,
  };

  return await processors[event.eventName](event, context);
}
