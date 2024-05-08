import { SocialEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { SubsocialService } from './modules/subsocial/subsocial.service';
import { WalletIdentityService } from './modules/subsocial/wallet-identity.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [SocialEventType.LIST_SPACES]: SubsocialService.listSpaces,
    [SocialEventType.GET_SPACE]: SubsocialService.getSpace,
    [SocialEventType.ARCHIVE_SPACE]: SubsocialService.archiveSpace,
    [SocialEventType.CREATE_SPACE]: SubsocialService.createSpace,
    [SocialEventType.LIST_POSTS]: SubsocialService.listPosts,
    [SocialEventType.GET_POST]: SubsocialService.getPost,
    [SocialEventType.ARCHIVE_POST]: SubsocialService.archivePost,
    [SocialEventType.CREATE_POST]: SubsocialService.createPost,
    [SocialEventType.GET_WALLET_IDENTITY]:
      WalletIdentityService.getWalletIdentityData,
    [SocialEventType.PROJECT_SOCIAL_DETAILS]:
      SubsocialService.getProjectSocialDetails,
  };

  return await processors[event.eventName](event, context);
}
