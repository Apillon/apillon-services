import { AmsEventType } from '@apillon/lib';
import { ServiceContext } from './context';

import { ApiKeyService } from './modules/api-key/api-key.service';
import { AuthUserService } from './modules/auth-user/auth-user.service';
import { OauthLinkService } from './modules/oauth-link/discord.service';
import { RoleService } from './modules/role/role.service';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [AmsEventType.USER_REGISTER]: AuthUserService.register,
    [AmsEventType.USER_LOGIN]: AuthUserService.login,
    [AmsEventType.USER_GET_AUTH]: AuthUserService.getAuthUser,
    [AmsEventType.USER_UPDATE]: AuthUserService.updateAuthUser,
    [AmsEventType.USER_PASSWORD_RESET]: AuthUserService.resetPassword,
    [AmsEventType.USER_EMAIL_EXISTS]: AuthUserService.emailExists,
    [AmsEventType.GET_AUTH_USER_BY_EMAIL]: AuthUserService.getAuthUserByEmail,

    [AmsEventType.USER_WALLET_LOGIN]: AuthUserService.loginWithWalletAddress,

    [AmsEventType.USER_ROLE_ASSIGN]: RoleService.assignUserRoleOnProject,
    [AmsEventType.USER_ROLE_REMOVE]: RoleService.removeUserRoleOnProject,

    [AmsEventType.CREATE_API_KEY]: ApiKeyService.createApiKey,
    [AmsEventType.DELETE_API_KEY]: ApiKeyService.deleteApiKey,
    [AmsEventType.LIST_API_KEYS]: ApiKeyService.listApiKeys,
    [AmsEventType.GET_API_KEY]: ApiKeyService.getApiKey,

    [AmsEventType.API_KEY_ROLE_ASSIGN]: RoleService.assignRoleToApiKey,
    [AmsEventType.API_KEY_ROLE_REMOVE]: RoleService.removeApiKeyRole,
    [AmsEventType.GET_API_KEY_ROLES]: RoleService.getApiKeyRoles,

    [AmsEventType.DISCORD_LINK]: OauthLinkService.linkDiscord,
    [AmsEventType.DISCORD_UNLINK]: OauthLinkService.unlinkDiscord,
    [AmsEventType.DISCORD_USER_LIST]: OauthLinkService.getDiscordUserList,
    [AmsEventType.GET_OAUTH_LINKS]: OauthLinkService.getUserOauthLinks,
  };

  return await processors[event.eventName](event, context);
}
