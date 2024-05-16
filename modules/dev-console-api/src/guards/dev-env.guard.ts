import { AppEnvironment, env } from '@apillon/lib';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DevEnvGuard implements CanActivate {
  constructor(@Inject(Reflector.name) private readonly reflector: Reflector) {}

  public async canActivate(_execCtx: ExecutionContext): Promise<boolean> {
    return (
      env.APP_ENV == AppEnvironment.TEST ||
      env.APP_ENV == AppEnvironment.LOCAL_DEV
    );
  }
}
