import { AppEnvironment, getEnvSecrets, MySql } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  WorkerLogStatus,
  writeWorkerLog,
} from '@apillon/workers-lib';

import { Context, env } from '@apillon/lib';
import { TestWorker } from './test-worker';
import { BuildProjectWorker } from './build-project-worker';

export enum WorkerName {
  TEST_WORKER = 'TestWorker',
  BUILD_PROJECT_WORKER = 'BuildProjectWorker',
  SCHEDULER = 'scheduler',
}

export async function handler(event: any) {
  await getEnvSecrets();

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
    params: { FunctionName: env.STORAGE_AWS_WORKER_LAMBDA_NAME },
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
    console.log(resp);
    return { batchItemFailures: [] };
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
  console.info('Handle sqs message. event.Records: ', event.Records);
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

      const workerName = message?.messageAttributes?.workerName?.stringValue;

      const workerDefinition = new WorkerDefinition(serviceDef, workerName, {
        id,
        parameters,
      });

      // eslint-disable-next-line sonarjs/no-small-switch
      switch (workerName) {
        case WorkerName.BUILD_PROJECT_WORKER: {
          await new BuildProjectWorker(
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
    } catch (error) {
      console.log(error);
      response.batchItemFailures.push({ itemIdentifier: message.messageId });
    }
  }
  console.log('Finished with response: ', response);
  return response;
}
