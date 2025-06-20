import { AppEnvironment, AWS_KMS, EncryptionService, env } from '@apillon/lib';
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
import { BackendController } from './modules/deploy/backend.controller';
import { DeployRepository } from './modules/deploy/repositores/deploy-repository';
import { BackendStrategyHandler } from './modules/deploy/backendStrategy.handler';
import { PhalaDockerDeployStrategy } from './modules/deploy/services/phala-docker-deploy.strategy';
import { PhalaCloudClient } from './modules/deploy/clients/phala-cloud.client';

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

  const serviceContext = context.serviceContext;
  const phalaDockerDeployStrategy = new PhalaDockerDeployStrategy(
    new PhalaCloudClient(
      env.DEPLOY_PHALA_CLOUD_API_URL,
      env.DEPLOY_PHALA_CLOUD_API_KEY,
    ),
  );
  const encryptionService = new EncryptionService(
    new AWS_KMS(),
    env.DEPLOY_KMS_KEY_ID,
  );
  const deployRepository = new DeployRepository(
    serviceContext,
    encryptionService,
  );
  const backendController = new BackendController(
    serviceContext,
    deployRepository,
    new BackendStrategyHandler(
      serviceContext,
      encryptionService,
      deployRepository,
      phalaDockerDeployStrategy,
    ),
    encryptionService,
  );
  return await processEvent(event, serviceContext, backendController);
};

/**
 * An object containing connection parameters for a MySQL database.
 */
const getConnectionParams = () => {
  return {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.DEPLOY_MYSQL_HOST_TEST
        : env.DEPLOY_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.DEPLOY_MYSQL_PORT_TEST
        : env.DEPLOY_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.DEPLOY_MYSQL_DATABASE_TEST
        : env.DEPLOY_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.DEPLOY_MYSQL_USER_TEST
        : env.DEPLOY_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.DEPLOY_MYSQL_PASSWORD_TEST
        : env.DEPLOY_MYSQL_PASSWORD,
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
