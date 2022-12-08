import * as aws from 'aws-sdk';
import {
  ServiceDefinitionType,
  WorkerDefinition,
  ServiceDefinition,
  writeWorkerLog,
  WorkerLogStatus,
  QueueWorkerType,
} from '@apillon/workers-lib';
import { AppEnvironment, MySql } from '@apillon/lib';

import { Context, env } from '@apillon/lib';
import { TestWorker } from './test-worker';
import { KiltWorker } from './kilt.worker';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

// Init AWS config with provided credentials.
aws.config.update({
  region: env.AWS_REGION,
  accessKeyId: env.AWS_KEY,
  secretAccessKey: env.AWS_SECRET,
});

export enum WorkerName {
  TEST_WORKER = 'TestWorker',
  SCHEDULER = 'scheduler',
  AUTHORIZATION_WORKER = 'AuthroizationWorker',
}

export async function handler(event: any) {
  const options = {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.STORAGE_MYSQL_HOST_TEST
        : env.STORAGE_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.STORAGE_MYSQL_PORT_TEST
        : env.STORAGE_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.STORAGE_MYSQL_DATABASE_TEST
        : env.STORAGE_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.STORAGE_MYSQL_USER_TEST
        : env.STORAGE_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.STORAGE_MYSQL_PASSWORD_TEST
        : env.STORAGE_MYSQL_PASSWORD,
  };

  const mysql = new MySql(options);
  await mysql.connect();
  const context = new Context();
  context.setMySql(mysql);

  const serviceDef = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: env.AWS_REGION },
    params: { FunctionName: env.AUTHORIZATION_AWS_WORKER_LAMBDA_NAME },
  };

  console.info(`EVENT: ${JSON.stringify(event)}`);

  try {
    if (event.Records) {
      await handleSqsMessages(event, context, serviceDef);
    } else {
      await handleLambdaEvent(event, context, serviceDef);
    }
    await context.mysql.close();
  } catch (e) {
    console.error('ERROR HANDLING LAMBDA!');
    console.error(e.message);
    await context.mysql.close();
    throw e;
  }
}

/**
 * Handles lambda invocation event
 * @param event Lambda invocation event
 * @param context App context
 * @param serviceDef Service definition
 */
export async function handleLambdaEvent(
  event: any,
  context: Context,
  serviceDef: ServiceDefinition,
) {
  let workerDefinition;
  if (event.workerName) {
    workerDefinition = new WorkerDefinition(
      serviceDef,
      event.workerName,
      event,
    );
  } else {
    workerDefinition = new WorkerDefinition(serviceDef, WorkerName.SCHEDULER);
  }

  // eslint-disable-next-line sonarjs/no-small-switch
  switch (workerDefinition.workerName) {
    case WorkerName.TEST_WORKER:
      const testLambda = new TestWorker(workerDefinition, context);
      await testLambda.run();
      break;
    default:
      console.log(
        `ERROR - INVALID WORKER NAME: ${workerDefinition.workerName}`,
      );
      await writeWorkerLog(
        context,
        WorkerLogStatus.ERROR,
        workerDefinition.workerName,
        null,
        `ERROR - INVALID WORKER NAME: ${workerDefinition.workerName}`,
      );
  }
}

/**
 * Handles SQS event messages
 * @param event SQS event
 * @param context App context
 * @param serviceDef service definitions
 */
export async function handleSqsMessages(
  event: any,
  context: Context,
  serviceDef: ServiceDefinition,
) {
  console.info('handle sqs message. event.Records: ', event.Records);
  for (const message of event.Records) {
    let parameters: any;
    if (message?.messageAttributes?.parameters?.stringValue) {
      parameters = JSON.parse(
        message?.messageAttributes?.parameters?.stringValue,
      );
    }

    let id: number;
    if (message?.messageAttributes?.jobId?.stringValue) {
      id = parseInt(message?.messageAttributes?.jobId?.stringValue);
    }

    const workerDefinition = new WorkerDefinition(
      serviceDef,
      message?.messageAttributes?.workerName?.stringValue,
      { id, parameters },
    );

    // eslint-disable-next-line sonarjs/no-small-switch
    switch (message?.messageAttributes?.workerName?.stringValue) {
      case WorkerName.AUTHORIZATION_WORKER: {
        await new AuthroizationWorker(
          workerDefinition,
          context,
          QueueWorkerType.EXECUTOR,
        ).run({
          executeArg: message?.body,
        });
        break;
      }
      default:
        console.log(
          `ERROR - INVALID WORKER NAME: ${message?.messageAttributes?.workerName}`,
        );
    }
  }
}
