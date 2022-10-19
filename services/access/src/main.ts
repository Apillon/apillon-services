import { AmsEventType } from 'at-lib';
import { Context } from 'aws-lambda/handler';
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

    [AmsEventType.USER_ROLE_ASSIGN]: RoleService.assignUserRoleOnProject,
    [AmsEventType.USER_ROLE_REMOVE]: RoleService.removeUserRoleOnProject,
  };

  return await processors[event.eventName](event, context);
}
