import { MySql } from 'at-lib';
import type { Context } from 'aws-lambda/handler';

export interface ServiceContext extends Context {
  mysql: MySql;
}
