import { Context, MySql } from 'at-lib';

export class ServiceContext extends Context {
  mysql: MySql;
}
