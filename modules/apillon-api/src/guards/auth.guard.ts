import {
  CodeException,
  DefaultApiKeyRole,
  ForbiddenErrorCodes,
} from '@apillon/lib';
import {
  ApiKeyPermissionPass,
  API_KEY_PERMISSION_KEY,
} from '@apillon/modules-lib';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApillonApiContext } from '../context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndMerge<
      ApiKeyPermissionPass[]
    >(API_KEY_PERMISSION_KEY, [execCtx.getHandler(), execCtx.getClass()]);

    const context: ApillonApiContext = execCtx.getArgByIndex(0).context;
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (requiredPermissions.length > 0) {
      for (const requiredPerm of requiredPermissions) {
        if (
          requiredPerm.role &&
          context.hasApiKeyRoleForServiceType(
            requiredPerm.role,
            requiredPerm.serviceType,
          )
        ) {
          return true;
        }
      }

      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: `Insufficient permissins - missing ${
          DefaultApiKeyRole[requiredPermissions[0].role]
        } permission`,
      });
    }
    return true;
  }
}
