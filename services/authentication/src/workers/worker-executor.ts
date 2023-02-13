import { AppEnvironment, MySql, env, getEnvSecrets } from '@apillon/lib';
import {
  ServiceDefinitionType,
  WorkerDefinition,
  ServiceDefinition,
  writeWorkerLog,
  WorkerLogStatus,
  QueueWorkerType,
} from '@apillon/workers-lib';

import { TestWorker } from './test-worker';
import { IdentityGenerateWorker } from './generate-identity.worker';
import { IdentityRevokeWorker } from './revoke-identity.worker';

import { Scheduler } from './scheduler';
import { ServiceContext } from '../context';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

export enum WorkerName {
  TEST_WORKER = 'TestWorker',
  SCHEDULER = 'scheduler',
  IDENTITY_GENERATE_WORKER = 'IdentityGenerateWorker',
  IDENTITY_REVOKE_WORKER = 'IdentityRevokeWorker',
}

export async function handler(event: any) {
  await getEnvSecrets();

  const options = {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.AUTH_API_HOST_TEST
        : env.AUTH_API_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.AUTH_API_MYSQL_PORT_TEST
        : env.AUTH_API_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.AUTH_API_MYSQL_DATABASE_TEST
        : env.AUTH_API_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.AUTH_API_MYSQL_USER_TEST
        : env.AUTH_API_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.AUTH_API_MYSQL_PASSWORD_TEST
        : env.AUTH_API_MYSQL_PASSWORD,
  };

  const mysql = new MySql(options);
  await mysql.connect();
  const context = new ServiceContext();
  context.setMySql(mysql);

  const serviceDef = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: env.AWS_REGION },
    params: { FunctionName: env.AUTH_AWS_WORKER_LAMBDA_NAME },
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
  context: ServiceContext,
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
    case WorkerName.SCHEDULER:
      const scheduler = new Scheduler(serviceDef, context);
      await scheduler.run();
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
  context,
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
      case WorkerName.IDENTITY_GENERATE_WORKER: {
        await new IdentityGenerateWorker(
          workerDefinition,
          context,
          QueueWorkerType.EXECUTOR,
        ).run({
          executeArg: message?.body,
        });
        break;
      }
      case WorkerName.IDENTITY_REVOKE_WORKER: {
        await new IdentityRevokeWorker(
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
