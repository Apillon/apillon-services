import { ServiceContext } from '@apillon/service-lib';
import { MySql } from '@apillon/lib';

// TODO: duplicate code from contracts service (reuse?)
export class BaseRepository {
  protected context: ServiceContext;
  protected mysql: MySql;

  constructor(context: ServiceContext) {
    this.context = context;
    this.mysql = context.mysql;
  }
}
