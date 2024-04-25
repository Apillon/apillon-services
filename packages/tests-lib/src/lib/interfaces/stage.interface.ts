import { HttpServer, INestApplication } from '@nestjs/common';
import { Context, Mongo, MySql } from '@apillon/lib';
import { TestContext } from '../helpers/context';

export enum StageName {
  DEV_CONSOLE = 'devConsole',
  ACCESS = 'access',
  STORAGE = 'storage',
  CONFIG = 'config',
  AUTH_API = 'authentication',
  REFERRAL = 'referral',
  NFTS = 'nfts',
  BLOCKCHAIN = 'blockchain',
  COMPUTING = 'computing',
  SOCIAL = 'social',
}

export type StageObject<Type> = {
  [key in StageName]: Type;
};

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
  db: StageObject<MySql>;
}

export interface ServiceStage {
  db: MySql;
  context: Context;
}
