import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CodeException,
  ForbiddenErrorCodes,
  UnauthorizedErrorCodes,
} from '@apillon/lib';

import { DevConsoleApiContext } from '../context';
import {
  PermissionPass,
  PERMISSION_KEY,
} from '../decorators/permission.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndMerge<PermissionPass[]>(
      PERMISSION_KEY,
      [execCtx.getHandler(), execCtx.getClass()],
    );

    const context: DevConsoleApiContext = execCtx.getArgByIndex(0).context;
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (!context.isAuthenticated()) {
      throw new CodeException({
        code: UnauthorizedErrorCodes.UNAUTHORIZED,
        status: HttpStatus.UNAUTHORIZED,
        errorMessage: 'User is not authenticated!',
      });
    } else if (requiredPermissions.length > 0) {
      for (const requiredPerm of requiredPermissions) {
        if (requiredPerm.role && context.hasRole(requiredPerm.role)) {
          return true;
        }
      }
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissins',
      });
    }
    return true;
  }
}
