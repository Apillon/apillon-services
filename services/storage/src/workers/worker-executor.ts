import { AppEnvironment, MySql } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  WorkerLogStatus,
  writeWorkerLog,
} from '@apillon/workers-lib';
import * as aws from 'aws-sdk';

import { Context, env } from '@apillon/lib';
import { SyncToIPFSWorker } from './s3-to-ipfs-sync-worker';
import { TestWorker } from './test-worker';
import { PinToCRUSTWorker } from './pin-to-crust-worker';

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
  SYNC_TO_IPFS_WORKER = 'SyncToIpfsWorker',
  PIN_TO_CRUST_WORKER = 'PinToCrustWorker',
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
    params: { FunctionName: env.STORAGE_AWS_WORKER_LAMBDA_NAME },
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

    let workerName = message?.messageAttributes?.workerName?.stringValue;
    if (!workerName) {
      //Worker name is not present in messageAttributes
      console.info('worker name not present in message.messageAttributes');
      if (message?.eventSourceARN == env.STORAGE_AWS_WORKER_SQS_ARN) {
        //Special cases: Sqs message can be sent from s3 - check if eventSourceARN is present in message
        workerName = WorkerName.SYNC_TO_IPFS_WORKER;
      }
    }

    console.info('worker name', workerName);
    console.info('STORAGE_AWS_WORKER_SQS_ARN', env.STORAGE_AWS_WORKER_SQS_ARN);

    const workerDefinition = new WorkerDefinition(serviceDef, workerName, {
      id,
      parameters,
    });

    // eslint-disable-next-line sonarjs/no-small-switch
    switch (workerName) {
      case WorkerName.SYNC_TO_IPFS_WORKER: {
        await new SyncToIPFSWorker(
          workerDefinition,
          context,
          QueueWorkerType.EXECUTOR,
        ).run({
          executeArg: message?.body,
        });
        break;
      }
      case WorkerName.PIN_TO_CRUST_WORKER: {
        await new PinToCRUSTWorker(
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
