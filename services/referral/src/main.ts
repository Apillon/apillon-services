import { ReferralEventType } from '@apillon/lib';
import { ReferralService } from './modules/referral/referral.service';
import { OauthService } from './modules/oauth/oauth.service';
import { PromoCodeService } from './modules/promo-code/promo-code.service';
import { ServiceContext } from '@apillon/service-lib';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
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
    [ReferralEventType.ADD_PROMO_CODE_CREDITS]:
      PromoCodeService.addPromoCodeCredits,
    [ReferralEventType.GET_AIRDROP_TASKS]: ReferralService.getAirdropTasks,
  };

  return await processors[event.eventName](event, context);
}
