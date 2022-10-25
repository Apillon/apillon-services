import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
    if (requiredPermissions.length && !context.isAuthenticated()) {
      return false;
    }

    /*
    TODO: call AMS, to check required permissions
    const hasPermissions = await context.hasPermissions(requiredPermissions);

    if (!hasPermissions) {
      throw new CodeException({
        status: HttpStatus.FORBIDDEN,
        code: AuthorizationErrorCode.INSUFFICIENT_PERMISSIONS,
        context,
      });
    }*/

    return true;
  }
}
