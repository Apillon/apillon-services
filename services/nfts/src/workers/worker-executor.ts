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
import { Scheduler } from './scheduler';
import { TransactionStatusWorker } from './transaction-status-worker';
import { DeployCollectionWorker } from './deploy-collection-worker';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

export enum WorkerName {
  TEST_WORKER = 'TestWorker',
  SCHEDULER = 'scheduler',
  PROCESS_TRANSACTION = 'ProcessTransactionWorker',
  TRANSACTION_STATUS = 'TransactionStatusWorker',
  DEPLOY_COLLECTION = 'DeployCollectionWorker',
}

export async function handler(event: any) {
  await getEnvSecrets();

  const options = {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.NFTS_MYSQL_HOST_TEST
        : env.NFTS_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.NFTS_MYSQL_PORT_TEST
        : env.NFTS_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.NFTS_MYSQL_DATABASE_TEST
        : env.NFTS_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.NFTS_MYSQL_USER_TEST
        : env.NFTS_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.NFTS_MYSQL_PASSWORD_TEST
        : env.NFTS_MYSQL_PASSWORD,
  };

  const mysql = new MySql(options);
  await mysql.connect();
  const context = new Context();
  context.setMySql(mysql);

  const serviceDef = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: env.AWS_REGION },
    params: { FunctionName: env.NFTS_AWS_WORKER_LAMBDA_NAME },
  };

  console.info(`EVENT: ${JSON.stringify(event)}`);

  try {
    if (event.Records) {
      return await handleSqsMessages(event, context, serviceDef);
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

  // if ([WorkerName.SYNC_OLD_API, WorkerName.SYNC_DELETED].includes(event.workerName)) {
  //   await context.closeMongo();
  // }
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const workerDefinition = new WorkerDefinition(serviceDef, workerName, {
        id,
        parameters,
      });

      // eslint-disable-next-line sonarjs/no-small-switch
      switch (workerName) {
        case WorkerName.DEPLOY_COLLECTION: {
          await new DeployCollectionWorker(
            workerDefinition,
            context,
            QueueWorkerType.EXECUTOR,
          ).run({
            executeArg: message?.body,
          });
          break;
        }
        case WorkerName.TRANSACTION_STATUS: {
          await new TransactionStatusWorker(
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
  return response;
}
