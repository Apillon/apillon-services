import { Mongo } from 'at-lib';
import { Context } from 'aws-lambda/handler';

export interface ServiceContext extends Context {
  mongo: Mongo;
}
