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
  CONTRACTS = 'contracts',
  INFRASTRUCTURE = 'infrastructure',
  MAILING = 'mailing',
  DEPLOY = 'deploy',
}

export type StageObject<Type> = {
  [key in StageName]: Type;
};

export interface Stage {
  app: INestApplication;
  http: HttpServer;
  lmasContext: TestContext;
  lmasMongo: Mongo;
  db: StageObject<MySql>;
  context: StageObject<TestContext>;
}

export interface ServiceStage {
  db: MySql;
  context: Context;
}
