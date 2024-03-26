import { HttpServer, INestApplication } from '@nestjs/common';
import { Context, Mongo, MySql } from '@apillon/lib';
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
  referralContext: TestContext;
  referralSql: MySql;
  nftsContext: TestContext;
  nftsSql: MySql;
  blockchainContext: TestContext;
  blockchainSql: MySql;
  socialContext: TestContext;
  socialSql: MySql;
  computingContext: TestContext;
  computingSql: MySql;
}

export interface ServiceStage {
  db: MySql;
  context: Context;
}
