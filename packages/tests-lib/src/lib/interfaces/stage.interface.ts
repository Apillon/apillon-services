import { HttpServer, INestApplication } from '@nestjs/common';
import { Context, Mongo, MySql } from '@apillon/lib';
import { TestContext } from '../helpers/context';

export interface ServiceObject<Type> {
  devConsole: Type;
  ams: Type;
  storage: Type;
  config: Type;
  authApi: Type;
  referral: Type;
  nfts: Type;
  blockchain: Type;
  social: Type;
  computing: Type;
}

export interface Stage {
  amsContext: TestContext;
  lmasContext: TestContext;
  devConsoleContext: TestContext;
  app: INestApplication;
  http: HttpServer;
  lmasMongo: Mongo;
  storageContext: TestContext;
  configContext: TestContext;
  authApiContext: TestContext;
  referralContext: TestContext;
  nftsContext: TestContext;
  blockchainContext: TestContext;
  socialContext: TestContext;
  computingContext: TestContext;
  sql: ServiceObject<MySql>;
}

export interface ServiceStage {
  db: MySql;
  context: Context;
}
