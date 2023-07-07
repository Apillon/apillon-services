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
import { Scheduler } from './scheduler';
import { ServiceContext } from '@apillon/service-lib';
import { UpdateStateWorker } from './update-state.worker';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

export enum WorkerName {
  TEST_WORKER = 'TestWorker',
  SCHEDULER = 'scheduler',
  UPDATE_STATE_WORKER = 'UpdateStateWorker',
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
    let resp;
    if (event.Records) {
      resp = await handleSqsMessages(event, context, serviceDef);
    } else {
      resp = await handleLambdaEvent(event, context, serviceDef);
    }
    await context.mysql.close();
    return resp;
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
    case WorkerName.UPDATE_STATE_WORKER: {
      await new UpdateStateWorker(
        workerDefinition,
        context,
        QueueWorkerType.EXECUTOR,
      ).run({});
    }
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
  const response = { batchItemFailures: [] };
  for (const message of event.Records) {
    try {
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
        case WorkerName.UPDATE_STATE_WORKER: {
          await new UpdateStateWorker(
            workerDefinition,
            context,
            QueueWorkerType.EXECUTOR,
          ).run({ executeArg: message?.body });
        }
        default:
          console.log(
            `ERROR - INVALID WORKER NAME: ${message?.messageAttributes?.workerName}`,
          );
      }
    } catch (error) {
      console.log(error);
      response.batchItemFailures.push({ itemIdentifier: message.messageId });
    }
  }
  return response;
}
