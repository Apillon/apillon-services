import { Context, MySql } from '@apillon/lib';
import type { Context as AwsContext } from 'aws-lambda/handler';

export interface ServiceContext extends Context, AwsContext {
  mysql: MySql;
}
