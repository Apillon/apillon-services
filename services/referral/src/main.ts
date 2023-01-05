import { ReferralEventType } from '@apillon/lib';
import { Context } from 'aws-lambda/handler';
import { ReferralService } from './modules/referral/referral.service';
import { OauthService } from './modules/oauth/oauth.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [ReferralEventType.CREATE_REFERRAL]: ReferralService.createReferral,
    [ReferralEventType.GET_REFERRAL]: ReferralService.getReferral,
    [ReferralEventType.GET_PRODUCTS]: ReferralService.getProducts,
    [ReferralEventType.ORDER_PRODUCT]: ReferralService.orderProduct,
    [ReferralEventType.CONNECT_GITHUB]: OauthService.linkGithub,
    [ReferralEventType.CONNECT_TWITTER]: OauthService.linkTwitter,
    [ReferralEventType.GET_TWITTER_LINK]:
      ReferralService.getTwitterAuthenticationLink,
    [ReferralEventType.GET_TWEETS]: ReferralService.getTweets,
    [ReferralEventType.CONFIRM_RETWEET]: ReferralService.confirmRetweet,
  };

  return await processors[event.eventName](event, context);
}
