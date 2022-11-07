import { DevConsoleApiContext } from '../context';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request } from 'express';
import { MySql } from '@apillon/lib';

export interface IRequest extends Request {
  context: DevConsoleApiContext;
  query: { [key: string]: undefined | string };
}

/**
 * Returns a middleware which creates a context.
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(
    @Inject('MYSQL_DB')
    private mysql: MySql,
  ) {}

  use(req: IRequest, res, next) {
    req.context = new DevConsoleApiContext();
    req.context.setMySql(this.mysql);
    next();
  }
}
