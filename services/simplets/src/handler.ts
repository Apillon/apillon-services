import {
  AppEnvironment,
  AuthenticationMicroservice,
  AWS_KMS,
  DeployMicroservice,
  EncryptionService,
  env,
  Lmas,
  Mailing,
  NftsMicroservice,
  Scs,
  StorageMicroservice,
} from '@apillon/lib';
import {
  ErrorHandler,
  InitializeContextAndFillUser,
  logLambdaEvent,
  MySqlConnect,
  ResponseFormat,
} from '@apillon/service-lib';
import middy from '@middy/core';
import type { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { SimpletsService } from './modules/simplets/services/simplets.service';
import { SimpletsRepository } from './modules/simplets/repositores/simplets-repository';
import { SimpletsSpendService } from './modules/simplets/services/simplets-spend.service';
import { SimpletsController } from './modules/simplets/simplets.controller';

/**
 * Handles AWS Lambda events and passes them to processEvent() for processing.
 * @param event - Lambda event object.
 * @param context - Lambda execution context.
 * @param _callback
 * @returns service response
 */
const lambdaHandler: Handler = async (
  event: any,
  context: any,
  _callback: Callback,
) => {
  logLambdaEvent(event);

  const logging = new Lmas();
  const serviceContext = context.serviceContext;

  const simpletsService = new SimpletsService(
    serviceContext,
    new SimpletsRepository(serviceContext),
    new DeployMicroservice(serviceContext),
    new StorageMicroservice(serviceContext),
    new NftsMicroservice(serviceContext),
    new AuthenticationMicroservice(serviceContext),
    new Mailing(serviceContext),
    new EncryptionService(new AWS_KMS(), env.DEPLOY_KMS_KEY_ID),
    logging,
  );
  const controller = new SimpletsController(
    serviceContext,
    new Scs(serviceContext),
    simpletsService,
    new SimpletsSpendService(serviceContext),
    logging,
  );

  return await processEvent(event, serviceContext, controller);
};

/**
 * An object containing connection parameters for a MySQL database.
 */
const getConnectionParams = () => {
  return {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.SIMPLETS_MYSQL_HOST_TEST
        : env.SIMPLETS_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.SIMPLETS_MYSQL_PORT_TEST
        : env.SIMPLETS_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.SIMPLETS_MYSQL_DATABASE_TEST
        : env.SIMPLETS_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.SIMPLETS_MYSQL_USER_TEST
        : env.SIMPLETS_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.SIMPLETS_MYSQL_PASSWORD_TEST
        : env.SIMPLETS_MYSQL_PASSWORD,
  };
};

/**
 *  Exposes the Lambda handler and sets up middleware functions to run before and after the processEvent() function is called.
 */
export const handler = middy(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect(getConnectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
