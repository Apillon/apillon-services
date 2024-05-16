/* eslint-disable sonarjs/no-useless-catch */
import { AppEnvironment, env } from '@apillon/lib';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DevEnvGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  public async canActivate(_execCtx: ExecutionContext): Promise<boolean> {
    return (
      env.APP_ENV == AppEnvironment.TEST ||
      env.APP_ENV == AppEnvironment.LOCAL_DEV
    );
  }
}
