import {
  AppEnvironment,
  getEnvSecrets,
  MySql,
  SubstrateChain,
  Context,
  env,
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
import { TransactionLogWorker } from './transaction-log-worker';
import { TransactionWebhookWorker } from './transaction-webhook-worker';
import { TransmitEvmTransactionWorker } from './transmit-evm-transaction-worker';
import { TransmitSubstrateTransactionWorker } from './transmit-substrate-transaction-worker';

import { CrustTransactionWorker } from './crust-transaction-worker';
// import { KiltTransactionWorker } from './substrate/kilt/kilt-transaction-worker';
import { EvmTransactionWorker } from './evm-transaction-worker';
import { SubstrateTransactionWorker } from './substrate-transaction-worker';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

export enum WorkerName {
  SCHEDULER = 'scheduler',
  TRANSMIT_SUBSTRATE_TRANSACTION = 'TransmitSubstrateTransaction',
  TRANSMIT_EVM_TRANSACTION = 'TransmitEVMTransaction',
  CRUST_TRANSACTIONS = 'CrustTransactions',
  EVM_TRANSACTIONS = 'EvmTransactions',
  TRANSACTION_WEBHOOKS = 'TransactionWebhooks',
  TRANSACTION_LOG = 'TransactionLog',
  KILT_TRANSACTIONS = 'KiltTransactions',
  SUBSTRATE_TRANSACTION = 'SubstrateTransaction',
}

export async function handler(event: any) {
  await getEnvSecrets();

  const options = {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.BLOCKCHAIN_MYSQL_HOST_TEST
        : env.BLOCKCHAIN_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.BLOCKCHAIN_MYSQL_PORT_TEST
        : env.BLOCKCHAIN_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.BLOCKCHAIN_MYSQL_DATABASE_TEST
        : env.BLOCKCHAIN_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.BLOCKCHAIN_MYSQL_USER_TEST
        : env.BLOCKCHAIN_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.BLOCKCHAIN_MYSQL_PASSWORD_TEST
        : env.BLOCKCHAIN_MYSQL_PASSWORD,
  };

  const mysql = new MySql(options);
  await mysql.connect();
  const context = new Context();
  context.setMySql(mysql);

  const serviceDef = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: env.AWS_REGION },
    params: { FunctionName: env.BLOCKCHAIN_AWS_WORKER_LAMBDA_NAME },
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

  console.log('Worker definition', workerDefinition);
  console.log('workerName: ', workerDefinition.workerName);

  switch (workerDefinition.workerName) {
    case WorkerName.SCHEDULER:
      const scheduler = new Scheduler(serviceDef, context);
      await scheduler.run();
      break;
    // --- TRANSMIT TRANSACTION WORKERS ---
    case WorkerName.TRANSMIT_EVM_TRANSACTION:
      await new TransmitEvmTransactionWorker(workerDefinition, context).run({
        executeArg: JSON.stringify(workerDefinition.parameters),
      });
      break;
    case WorkerName.TRANSMIT_SUBSTRATE_TRANSACTION:
      await new TransmitSubstrateTransactionWorker(
        workerDefinition,
        context,
      ).run({
        executeArg: JSON.stringify({ chain: SubstrateChain.CRUST }),
      });
      break;
    // --- UPDATE TRANSACTIONS WORKERS ---
    // SUBSTRATE
    // case WorkerName.CRUST_TRANSACTIONS:
    //   await new CrustTransactionWorker(workerDefinition, context).run();
    //   break;

    // !!!!WIP!!!! - SUBSTRATE TRANSACTION WORKER
    case WorkerName.SUBSTRATE_TRANSACTION:
      await new SubstrateTransactionWorker(workerDefinition, context).run();
      break;
    // --- EVM ---
    case WorkerName.EVM_TRANSACTIONS:
      await new EvmTransactionWorker(workerDefinition, context).run({
        executeArg: JSON.stringify(workerDefinition.parameters),
      });
      break;
    // TRANSACTIONS WEBHOOKS
    case WorkerName.TRANSACTION_WEBHOOKS:
      await new TransactionWebhookWorker(
        workerDefinition,
        context,
        QueueWorkerType.PLANNER,
      ).run();
      break;
    case WorkerName.TRANSACTION_LOG:
      await new TransactionLogWorker(
        workerDefinition,
        context,
        QueueWorkerType.PLANNER,
      ).run();
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

      const workerDefinition = new WorkerDefinition(serviceDef, workerName, {
        id,
        parameters,
      });

      console.log('Worker definition', workerDefinition);
      console.log('workerName: ', workerDefinition.workerName);

      // eslint-disable-next-line sonarjs/no-small-switch
      switch (workerName) {
        // -- TRANSMIT TRANSACTION WORKERS --
        case WorkerName.TRANSMIT_SUBSTRATE_TRANSACTION:
          await new TransmitSubstrateTransactionWorker(
            workerDefinition,
            context,
          ).run({
            executeArg: message?.body,
          });
          break;
        case WorkerName.TRANSMIT_EVM_TRANSACTION:
          await new TransmitEvmTransactionWorker(workerDefinition, context).run(
            {
              executeArg: message?.body,
            },
          );
          break;
        // case WorkerName.CRUST_TRANSACTIONS:
        //   await new CrustTransactionWorker(workerDefinition, context).run();
        //   break;
        case WorkerName.EVM_TRANSACTIONS:
          await new EvmTransactionWorker(workerDefinition, context).run({
            executeArg: message?.body,
          });
          break;
        case WorkerName.TRANSACTION_WEBHOOKS:
          await new TransactionWebhookWorker(
            workerDefinition,
            context,
            QueueWorkerType.EXECUTOR,
          ).run({
            executeArg: message?.body,
          });
          break;
        case WorkerName.TRANSACTION_LOG:
          await new TransactionLogWorker(
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
