import type { Mongo } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';

export interface ServiceContext extends Context {
  mongo: Mongo;
}
