import {
  AppEnvironment,
  Context,
  env,
  getEnvSecrets,
  MySql,
} from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  WorkerLogStatus,
  writeWorkerLog,
} from '@apillon/workers-lib';
import { Scheduler } from './scheduler';
import { TransactionStatusWorker } from './transaction-status-worker';
import { PhalaLogWorker } from './phala-log-worker';
import { AcurastJobStatusWorker } from './acurast-job-status-worker';

export enum WorkerName {
  SCHEDULER = 'scheduler',
  TRANSACTION_STATUS = 'TransactionStatusWorker',
  PHALA_LOG_WORKER = 'PhalaLogWorker',
  ACURAST_JOB_STATUS_WORKER = 'AcurastJobStatusWorker',
}

export async function handler(event: any) {
  await getEnvSecrets();

  const options = {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.COMPUTING_MYSQL_HOST_TEST
        : env.COMPUTING_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.COMPUTING_MYSQL_PORT_TEST
        : env.COMPUTING_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.COMPUTING_MYSQL_DATABASE_TEST
        : env.COMPUTING_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.COMPUTING_MYSQL_USER_TEST
        : env.COMPUTING_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.COMPUTING_MYSQL_PASSWORD_TEST
        : env.COMPUTING_MYSQL_PASSWORD,
  };

  const mysql = new MySql(options);
  await mysql.connect();
  const context = new Context();
  context.setMySql(mysql);

  const serviceDef = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: env.AWS_REGION },
    params: { FunctionName: env.COMPUTING_AWS_WORKER_LAMBDA_NAME },
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
  switch (workerDefinition.workerName) {
    case WorkerName.SCHEDULER:
      const scheduler = new Scheduler(serviceDef, context);
      await scheduler.run();
      break;
    case WorkerName.PHALA_LOG_WORKER:
      await new PhalaLogWorker(
        workerDefinition,
        context,
        QueueWorkerType.PLANNER,
      ).run();
      break;
    case WorkerName.ACURAST_JOB_STATUS_WORKER:
      await new AcurastJobStatusWorker(workerDefinition, context).run();
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

      switch (workerName) {
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
        case WorkerName.PHALA_LOG_WORKER:
          await new PhalaLogWorker(
            workerDefinition,
            context,
            QueueWorkerType.EXECUTOR,
          ).run({
            executeArg: message?.body,
          });
          break;
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
