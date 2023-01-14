import { HttpServer, INestApplication } from '@nestjs/common';
import { Mongo, MySql } from '@apillon/lib';
import { TestContext } from '../helpers/context';

export interface Stage {
  amsContext: TestContext;
  lmasContext: TestContext;
  devConsoleContext: TestContext;
  app: INestApplication;
  http: HttpServer;
  amsSql: MySql;
  lmasMongo: Mongo;
  devConsoleSql: MySql;
  storageContext: TestContext;
  storageSql: MySql;
  configContext: TestContext;
  configSql: MySql;
  authApiContext: TestContext;
  authApiSql: MySql;
}
