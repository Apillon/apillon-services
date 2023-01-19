import { ReferralEventType } from '@apillon/lib';
import { Context } from 'aws-lambda/handler';
import { ReferralService } from './modules/referral/referral.service';
import { OauthService } from './modules/oauth/oauth.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [ReferralEventType.CREATE_PLAYER]: ReferralService.createPlayer,
    [ReferralEventType.GET_PLAYER]: ReferralService.getPlayer,
    [ReferralEventType.GET_PRODUCTS]: ReferralService.getProducts,
    [ReferralEventType.ORDER_PRODUCT]: ReferralService.orderProduct,
    [ReferralEventType.CONNECT_GITHUB]: OauthService.linkGithub,
    [ReferralEventType.DISCONNECT_GITHUB]: OauthService.unlinkGithub,
    [ReferralEventType.CONNECT_TWITTER]: OauthService.linkTwitter,
    [ReferralEventType.DISCONNECT_TWITTER]: OauthService.unlinkTwitter,
    [ReferralEventType.GET_TWITTER_LINK]:
      ReferralService.getTwitterAuthenticationLink,
    [ReferralEventType.GET_TWEETS]: ReferralService.getTweets,
    [ReferralEventType.CONFIRM_RETWEET]: ReferralService.confirmRetweet,
  };

  return await processors[event.eventName](event, context);
}
