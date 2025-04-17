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
import { TransactionLogWorker } from './transaction-log-worker';
import { TransactionWebhookWorker } from './transaction-webhook-worker';
import { TransmitEvmTransactionWorker } from './transmit-evm-transaction-worker';
import { TransmitSubstrateTransactionWorker } from './transmit-substrate-transaction-worker';

import { EvmTransactionWorker } from './evm-transaction-worker';
import { SubstrateTransactionWorker } from './substrate-transaction-worker';
import { PhalaTransactionWorker } from './phala-transaction-worker';
import { SubsocialTransactionWorker } from './subsocial-transaction-worker';
import { CheckPendingTransactionsWorker } from './check-pending-transactions-worker';
import { SubstrateContractTransactionWorker } from './substrate-contract-transaction-worker';
import { OasisContractEventsWorker } from './oasis-contract-events-worker';
import { AcurastJobTransactionWorker } from './accurast-job-transaction-worker';
import { UniqueJobTransactionWorker } from './unique-substrate-transaction-worker';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

export enum WorkerName {
  SCHEDULER = 'scheduler',
  TRANSMIT_CRUST_TRANSACTIONS = 'TransmitCrustTransactions',
  TRANSMIT_KILT_TRANSACTIONS = 'TransmitKiltTransactions',
  TRANSMIT_PHALA_TRANSACTIONS = 'TransmitPhalaTransactions',
  TRANSMIT_MOONBEAM_TRANSACTIONS = 'TransmitMoonbeamTransactions',
  TRANSMIT_MOONBASE_TRANSACTIONS = 'TransmitMoonbaseTransactions',
  TRANSMIT_XSOCIAL_TRANSACTION = 'TransmitXsocialTransactions',
  TRANSMIT_SUBSOCIAL_TRANSACTION = 'TransmitSubsocialTransactions',
  TRANSMIT_ASTAR_TRANSACTIONS = 'TransmitAstarTransactions',
  TRANSMIT_ASTAR_SUBSTRATE_TRANSACTIONS = 'TransmitAstarSubstrateTransactions',
  TRANSMIT_ACURAST_TRANSACTIONS = 'TransmitAcurastTransactions',
  TRANSMIT_ETHEREUM_TRANSACTIONS = 'TransmitEthereumTransactions',
  TRANSMIT_SEPOLIA_TRANSACTIONS = 'TransmitSepoliaTransactions',
  TRANSMIT_UNIQUE_TRANSACTIONS = 'TransmitUniqueTransactions',
  TRANSMIT_CELO_TRANSACTIONS = 'TransmitCeloTransactions',
  TRANSMIT_ALFAJORES_TRANSACTIONS = 'TransmitAlfajoresTransactions',
  VERIFY_CRUST_TRANSACTIONS = 'VerifyCrustTransactions',
  VERIFY_KILT_TRANSACTIONS = 'VerifyKiltTransactions',
  VERIFY_PHALA_TRANSACTIONS = 'VerifyPhalaTransactions',
  VERIFY_SUBSOCIAL_TRANSACTIONS = 'VerifySubsocialTransactions',
  VERIFY_XSOCIAL_TRANSACTIONS = 'VerifyXsocialTransactions',
  VERIFY_ASTAR_SUBSTRATE_TRANSACTIONS = 'VerifyAstarSubstrateTransactions',
  VERIFY_MOONBEAM_TRANSACTIONS = 'VerifyMoonbeamTransactions',
  VERIFY_MOONBASE_TRANSACTIONS = 'VerifyMoonbaseTransactions',
  VERIFY_ASTAR_TRANSACTIONS = 'VerifyAstarTransactions',
  VERIFY_ETHEREUM_TRANSACTIONS = 'VerifyEthereumTransactions',
  VERIFY_SEPOLIA_TRANSACTIONS = 'VerifySepoliaTransactions',
  VERIFY_ACURAST_TRANSACTIONS = 'VerifyAcurastTransactions',
  VERIFY_UNIQUE_TRANSACTIONS = 'VerifyUniqueTransactions',
  VERIFY_CELO_TRANSACTIONS = 'VerifyCeloTransactions',
  VERIFY_ALFAJORES_TRANSACTIONS = 'VerifyAlfajoresTransactions',
  TRANSACTION_WEBHOOKS = 'TransactionWebhooks',
  TRANSACTION_LOG = 'TransactionLog',
  CHECK_PENDING_TRANSACTIONS = 'CheckPendingTransactions',
  OASIS_CONTRACT_EVENTS_WORKER = 'OasisContractEventsWorker',
  TRANSMIT_BASE_TRANSACTIONS = 'TransmitBaseTransactions',
  VERIFY_BASE_TRANSACTIONS = 'VerifyBaseTransactions',
  TRANSMIT_BASE_SEPOLIA_TRANSACTIONS = 'TransmitBaseSepoliaTransactions',
  VERIFY_BASE_SEPOLIA_TRANSACTIONS = 'VerifyBaseSepoliaTransactions',
  TRANSMIT_ARBITRUM_ONE_TRANSACTIONS = 'TransmitArbitrumOneTransactions',
  VERIFY_ARBITRUM_ONE_TRANSACTIONS = 'VerifyArbitrumOneTransactions',
  TRANSMIT_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS = 'TransmitArbitrumOneSepoliaTransactions',
  VERIFY_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS = 'VerifyArbitrumOneSepoliaTransactions',
  TRANSMIT_AVALANCHE_TRANSACTIONS = 'TransmitAvalancheTransactions',
  VERIFY_AVALANCHE_TRANSACTIONS = 'VerifyAvalancheTransactions',
  TRANSMIT_AVALANCHE_FUJI_TRANSACTIONS = 'TransmitAvalancheFujiTransactions',
  VERIFY_AVALANCHE_FUJI_TRANSACTIONS = 'VerifyAvalancheFujiTransactions',
  TRANSMIT_OPTIMISM_TRANSACTIONS = 'TransmitOptimismTransactions',
  VERIFY_OPTIMISM_TRANSACTIONS = 'VerifyOptimismTransactions',
  TRANSMIT_OPTIMISM_SEPOLIA_TRANSACTIONS = 'TransmitOptimismSepoliaTransactions',
  VERIFY_OPTIMISM_SEPOLIA_TRANSACTIONS = 'VerifyOptimismSepoliaTransactions',
  TRANSMIT_POLYGON_TRANSACTIONS = 'TransmitPolygonTransactions',
  VERIFY_POLYGON_TRANSACTIONS = 'VerifyPolygonTransactions',
  TRANSMIT_POLYGON_AMOY_TRANSACTIONS = 'TransmitPolygonAmoyTransactions',
  VERIFY_POLYGON_AMOY_TRANSACTIONS = 'VerifyPolygonAmoyTransactions',
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
    case WorkerName.TRANSMIT_ETHEREUM_TRANSACTIONS:
    case WorkerName.TRANSMIT_SEPOLIA_TRANSACTIONS:
    case WorkerName.TRANSMIT_MOONBEAM_TRANSACTIONS:
    case WorkerName.TRANSMIT_MOONBASE_TRANSACTIONS:
    case WorkerName.TRANSMIT_ASTAR_TRANSACTIONS:
    case WorkerName.TRANSMIT_CELO_TRANSACTIONS:
    case WorkerName.TRANSMIT_ALFAJORES_TRANSACTIONS:
    case WorkerName.TRANSMIT_BASE_TRANSACTIONS:
    case WorkerName.TRANSMIT_BASE_SEPOLIA_TRANSACTIONS:
    case WorkerName.TRANSMIT_ARBITRUM_ONE_TRANSACTIONS:
    case WorkerName.TRANSMIT_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS:
    case WorkerName.TRANSMIT_AVALANCHE_TRANSACTIONS:
    case WorkerName.TRANSMIT_AVALANCHE_FUJI_TRANSACTIONS:
    case WorkerName.TRANSMIT_OPTIMISM_TRANSACTIONS:
    case WorkerName.TRANSMIT_OPTIMISM_SEPOLIA_TRANSACTIONS:
    case WorkerName.TRANSMIT_POLYGON_TRANSACTIONS:
    case WorkerName.TRANSMIT_POLYGON_AMOY_TRANSACTIONS:
      await new TransmitEvmTransactionWorker(workerDefinition, context).run({
        executeArg: JSON.stringify(workerDefinition.parameters),
      });
      break;
    case WorkerName.TRANSMIT_CRUST_TRANSACTIONS:
    case WorkerName.TRANSMIT_KILT_TRANSACTIONS:
    case WorkerName.TRANSMIT_PHALA_TRANSACTIONS:
    case WorkerName.TRANSMIT_SUBSOCIAL_TRANSACTION:
    case WorkerName.TRANSMIT_XSOCIAL_TRANSACTION:
    case WorkerName.TRANSMIT_ASTAR_SUBSTRATE_TRANSACTIONS:
    case WorkerName.TRANSMIT_ACURAST_TRANSACTIONS:
    case WorkerName.TRANSMIT_UNIQUE_TRANSACTIONS:
      await new TransmitSubstrateTransactionWorker(
        workerDefinition,
        context,
      ).run({
        executeArg: JSON.stringify(workerDefinition.parameters),
      });
      break;

    // SUBSTRATE TRANSACTION WORKER
    case WorkerName.VERIFY_CRUST_TRANSACTIONS:
    case WorkerName.VERIFY_KILT_TRANSACTIONS:
      await new SubstrateTransactionWorker(workerDefinition, context).run();
      break;
    case WorkerName.VERIFY_PHALA_TRANSACTIONS:
      await new PhalaTransactionWorker(workerDefinition, context).run();
      break;
    case WorkerName.VERIFY_SUBSOCIAL_TRANSACTIONS:
    case WorkerName.VERIFY_XSOCIAL_TRANSACTIONS:
      await new SubsocialTransactionWorker(workerDefinition, context).run();
      break;
    case WorkerName.VERIFY_ASTAR_SUBSTRATE_TRANSACTIONS:
      await new SubstrateContractTransactionWorker(
        workerDefinition,
        context,
      ).run();
      break;
    case WorkerName.VERIFY_ACURAST_TRANSACTIONS:
      await new AcurastJobTransactionWorker(workerDefinition, context).run();
      break;
    case WorkerName.VERIFY_UNIQUE_TRANSACTIONS:
      await new UniqueJobTransactionWorker(workerDefinition, context).run();
      break;
    // --- EVM ---
    case WorkerName.VERIFY_ETHEREUM_TRANSACTIONS:
    case WorkerName.VERIFY_SEPOLIA_TRANSACTIONS:
    case WorkerName.VERIFY_MOONBASE_TRANSACTIONS:
    case WorkerName.VERIFY_MOONBEAM_TRANSACTIONS:
    case WorkerName.VERIFY_ASTAR_TRANSACTIONS:
    case WorkerName.VERIFY_CELO_TRANSACTIONS:
    case WorkerName.VERIFY_ALFAJORES_TRANSACTIONS:
    case WorkerName.VERIFY_BASE_TRANSACTIONS:
    case WorkerName.VERIFY_BASE_SEPOLIA_TRANSACTIONS:
    case WorkerName.VERIFY_ARBITRUM_ONE_TRANSACTIONS:
    case WorkerName.VERIFY_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS:
    case WorkerName.VERIFY_AVALANCHE_TRANSACTIONS:
    case WorkerName.VERIFY_AVALANCHE_FUJI_TRANSACTIONS:
    case WorkerName.VERIFY_OPTIMISM_TRANSACTIONS:
    case WorkerName.VERIFY_OPTIMISM_SEPOLIA_TRANSACTIONS:
    case WorkerName.VERIFY_POLYGON_TRANSACTIONS:
    case WorkerName.VERIFY_POLYGON_AMOY_TRANSACTIONS:
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
    case WorkerName.CHECK_PENDING_TRANSACTIONS: {
      const checkPendingTransactionsWorker = new CheckPendingTransactionsWorker(
        workerDefinition,
        context,
      );
      await checkPendingTransactionsWorker.run();
      break;
    }
    case WorkerName.OASIS_CONTRACT_EVENTS_WORKER: {
      await new OasisContractEventsWorker(workerDefinition, context).run({
        executeArg: JSON.stringify(workerDefinition.parameters),
      });
      break;
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
        case WorkerName.TRANSMIT_CRUST_TRANSACTIONS:
        case WorkerName.TRANSMIT_KILT_TRANSACTIONS:
        case WorkerName.TRANSMIT_PHALA_TRANSACTIONS:
        case WorkerName.TRANSMIT_ASTAR_SUBSTRATE_TRANSACTIONS:
        case WorkerName.TRANSMIT_ACURAST_TRANSACTIONS:
        case WorkerName.TRANSMIT_UNIQUE_TRANSACTIONS:
          await new TransmitSubstrateTransactionWorker(
            workerDefinition,
            context,
          ).run({
            executeArg: message?.body,
          });
          break;
        case WorkerName.TRANSMIT_ETHEREUM_TRANSACTIONS:
        case WorkerName.TRANSMIT_SEPOLIA_TRANSACTIONS:
        case WorkerName.TRANSMIT_MOONBEAM_TRANSACTIONS:
        case WorkerName.TRANSMIT_MOONBASE_TRANSACTIONS:
        case WorkerName.TRANSMIT_ASTAR_TRANSACTIONS:
        case WorkerName.TRANSMIT_CELO_TRANSACTIONS:
        case WorkerName.TRANSMIT_ALFAJORES_TRANSACTIONS:
        case WorkerName.TRANSMIT_BASE_TRANSACTIONS:
        case WorkerName.TRANSMIT_BASE_SEPOLIA_TRANSACTIONS:
        case WorkerName.TRANSMIT_OPTIMISM_TRANSACTIONS:
        case WorkerName.TRANSMIT_OPTIMISM_SEPOLIA_TRANSACTIONS:
        case WorkerName.TRANSMIT_ARBITRUM_ONE_TRANSACTIONS:
        case WorkerName.TRANSMIT_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS:
        case WorkerName.TRANSMIT_AVALANCHE_TRANSACTIONS:
        case WorkerName.TRANSMIT_AVALANCHE_FUJI_TRANSACTIONS:
        case WorkerName.TRANSMIT_POLYGON_TRANSACTIONS:
        case WorkerName.TRANSMIT_POLYGON_AMOY_TRANSACTIONS:
          await new TransmitEvmTransactionWorker(workerDefinition, context).run(
            {
              executeArg: message?.body,
            },
          );
          break;
        // case WorkerName.CRUST_TRANSACTIONS:
        //   await new CrustTransactionWorker(workerDefinition, context).run();
        //   break;
        case WorkerName.VERIFY_ETHEREUM_TRANSACTIONS:
        case WorkerName.VERIFY_SEPOLIA_TRANSACTIONS:
        case WorkerName.VERIFY_ALFAJORES_TRANSACTIONS:
        case WorkerName.VERIFY_CELO_TRANSACTIONS:
        case WorkerName.VERIFY_MOONBEAM_TRANSACTIONS:
        case WorkerName.VERIFY_MOONBASE_TRANSACTIONS:
        case WorkerName.VERIFY_ASTAR_TRANSACTIONS:
        case WorkerName.VERIFY_BASE_TRANSACTIONS:
        case WorkerName.VERIFY_BASE_SEPOLIA_TRANSACTIONS:
        case WorkerName.VERIFY_OPTIMISM_TRANSACTIONS:
        case WorkerName.VERIFY_OPTIMISM_SEPOLIA_TRANSACTIONS:
        case WorkerName.VERIFY_ARBITRUM_ONE_TRANSACTIONS:
        case WorkerName.VERIFY_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS:
        case WorkerName.VERIFY_AVALANCHE_TRANSACTIONS:
        case WorkerName.VERIFY_AVALANCHE_FUJI_TRANSACTIONS:
        case WorkerName.VERIFY_POLYGON_TRANSACTIONS:
        case WorkerName.VERIFY_POLYGON_AMOY_TRANSACTIONS:
          await new EvmTransactionWorker(workerDefinition, context).run({
            executeArg: message?.body,
          });
          break;

        case WorkerName.VERIFY_CRUST_TRANSACTIONS:
        case WorkerName.VERIFY_KILT_TRANSACTIONS:
          await new SubstrateTransactionWorker(workerDefinition, context).run();
          break;
        case WorkerName.VERIFY_PHALA_TRANSACTIONS:
          await new PhalaTransactionWorker(workerDefinition, context).run();
          break;
        case WorkerName.VERIFY_SUBSOCIAL_TRANSACTIONS:
        case WorkerName.VERIFY_XSOCIAL_TRANSACTIONS:
          await new SubsocialTransactionWorker(workerDefinition, context).run();
          break;
        case WorkerName.VERIFY_ASTAR_SUBSTRATE_TRANSACTIONS:
          await new SubstrateContractTransactionWorker(
            workerDefinition,
            context,
          ).run();
          break;
        case WorkerName.VERIFY_ACURAST_TRANSACTIONS:
          await new AcurastJobTransactionWorker(
            workerDefinition,
            context,
          ).run();
          break;
        case WorkerName.VERIFY_UNIQUE_TRANSACTIONS:
          await new UniqueJobTransactionWorker(workerDefinition, context).run();
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
