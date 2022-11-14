import { Context, MySql } from '@apillon/lib';

export class ServiceContext extends Context {
  mysql: MySql;
}
