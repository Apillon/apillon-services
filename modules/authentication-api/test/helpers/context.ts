import { MySql } from '@apillon/lib';
import { Context, Mongo } from '@apillon/lib';

export class TestContext extends Context {
  public mongo: Mongo;
  public mysql: MySql;
}
