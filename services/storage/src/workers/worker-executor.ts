import * as aws from 'aws-sdk';
import {
  ServiceDefinitionType,
  WorkerDefinition,
  ServiceDefinition,
  writeWorkerLog,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { Scheduler } from './scheduler';
import { MySql } from '@apillon/lib';

import { Context, env } from '@apillon/lib';
import { TestWorker } from './test-worker';

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
}

export async function handler(event: any) {
  // global['mysql'].connect();
  /*const mysql = new MySql(env);
  await mysql.connect();
  const context = new Context(env);
  context.setMySql(mysql);*/

  const serviceDef = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: env.AWS_REGION },
    params: { FunctionName: env.AWS_WORKER_LAMBDA_NAME },
  };

  // console.log(`EVENT: ${JSON.stringify(event)}`);

  try {
    if (event.Records) {
      await handleSqsMessages(event, context, serviceDef);
    } else {
      await handleLambdaEvent(event, context, serviceDef);
    }
    await context.close();
  } catch (e) {
    console.error('ERROR HANDLING LAMBDA!');
    console.error(e.message);
    await context.close();
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

  if (
    [WorkerName.SYNC_OLD_API, WorkerName.SYNC_DELETED].includes(
      event.workerName,
    )
  ) {
    await context.connectToMongo();
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
  const jobWithMongo = event.Records.filter((j: any) =>
    [WorkerName.SYNC_OLD_API, WorkerName.SYNC_DELETED].includes(
      j?.messageAttributes?.workerName?.stringValue,
    ),
  );
  if (jobWithMongo.length) {
    await context.connectToMongo();
  }

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
      default:
        console.log(
          `ERROR - INVALID WORKER NAME: ${message?.messageAttributes?.workerName}`,
        );
    }
  }
}
