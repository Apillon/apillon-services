import { AmsEventType } from '@apillon/lib';
import { Context } from 'aws-lambda/handler';
import { ApiKeyService } from './modules/api-key/api-key.service';
import { AuthUserService } from './modules/auth-user/auth-user.service';
import { RoleService } from './modules/role/role.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [AmsEventType.USER_REGISTER]: AuthUserService.register,
    [AmsEventType.USER_LOGIN]: AuthUserService.login,
    [AmsEventType.USER_GET_AUTH]: AuthUserService.getAuthUser,
    [AmsEventType.USER_UPDATE]: AuthUserService.updateAuthUser,
    [AmsEventType.USER_PASSWORD_RESET]: AuthUserService.resetPassword,
    [AmsEventType.USER_EMAIL_EXISTS]: AuthUserService.emailExists,
    [AmsEventType.GET_AUTH_USER_BY_EMAIL]: AuthUserService.getAuthUserByEmail,

    [AmsEventType.USER_ROLE_ASSIGN]: RoleService.assignUserRoleOnProject,
    [AmsEventType.USER_ROLE_REMOVE]: RoleService.removeUserRoleOnProject,

    [AmsEventType.CREATE_API_KEY]: ApiKeyService.createApiKey,
    [AmsEventType.DELETE_API_KEY]: ApiKeyService.deleteApiKey,
    [AmsEventType.LIST_API_KEYS]: ApiKeyService.listApiKeys,

    [AmsEventType.API_KEY_ROLE_ASSIGN]: RoleService.assignRoleToApiKey,
    [AmsEventType.API_KEY_ROLE_REMOVE]: RoleService.removeApiKeyRole,
  };

  return await processors[event.eventName](event, context);
}
