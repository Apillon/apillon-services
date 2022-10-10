import { Mongo, MySql } from 'at-lib';
import { Context } from 'aws-lambda/handler';

export interface ServiceContext extends Context {
  mysql: MySql;
}
