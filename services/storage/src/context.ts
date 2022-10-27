import { Context, MySql } from 'at-lib';

export interface ServiceContext extends Context {
  mysql: MySql;
}
