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
import { SyncToIPFSWorker } from './s3-to-ipfs-sync-worker';
import { TestWorker } from './test-worker';
import { Scheduler } from './scheduler';
import { DeployWebsiteWorker } from './deploy-website-worker';
import { DeleteBucketDirectoryFileWorker } from './delete-bucket-directory-file-worker';
import { UpdateCrustStatusWorker } from './update-crust-status-worker';
import { PrepareMetadataForCollectionWorker } from './prepare-metada-for-collection-worker';
import { PinToCrustWorker } from './pin-to-crust-worker';
import { RepublishIpnsWorker } from './republish-ipns-worker';
import { IpfsBandwidthWorker } from './ipfs-bandwidth-worker';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

export enum WorkerName {
  TEST_WORKER = 'TestWorker',
  SCHEDULER = 'scheduler',
  SYNC_TO_IPFS_WORKER = 'SyncToIpfsWorker',
  DELETE_BUCKET_DIRECTORY_FILE_WORKER = 'DeleteBucketDirectoryFileWorker',
  DEPLOY_WEBSITE_WORKER = 'DeployWebsiteWorker',
  UPDATE_CRUST_STATUS_WORKER = 'UpdateCrustStatusWorker',
  PREPARE_METADATA_FOR_COLLECTION_WORKER = 'PrepareMetadataForCollectionWorker',
  PREPARE_BASE_URI_FOR_COLLECTION_WORKER = 'PrepareBaseUriForCollectionWorker',
  PIN_TO_CRUST_WORKER = 'PinToCrustWorker',
  REPUBLISH_IPNS_WORKER = 'RepublishIpnsWorker',
  IPFS_BANDWIDTH_WORKER = 'IpfsBandwidthWorker',
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
    case WorkerName.SCHEDULER:
      const scheduler = new Scheduler(serviceDef, context);
      await scheduler.run();
      break;
    case WorkerName.DELETE_BUCKET_DIRECTORY_FILE_WORKER:
      const workerForDeletion = new DeleteBucketDirectoryFileWorker(
        workerDefinition,
        context,
      );
      await workerForDeletion.run();
      break;
    case WorkerName.PIN_TO_CRUST_WORKER:
      const pinToCrustWorker = new PinToCrustWorker(workerDefinition, context);
      await pinToCrustWorker.run();
      break;
    case WorkerName.REPUBLISH_IPNS_WORKER:
      await new RepublishIpnsWorker(
        workerDefinition,
        context,
        QueueWorkerType.PLANNER,
      ).run();
      break;
    case WorkerName.IPFS_BANDWIDTH_WORKER:
      const ipfsBandwidthWorker = new IpfsBandwidthWorker(
        workerDefinition,
        context,
      );
      await ipfsBandwidthWorker.run();
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
      console.info(
        'STORAGE_AWS_WORKER_SQS_ARN',
        env.STORAGE_AWS_WORKER_SQS_ARN,
      );

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
        case WorkerName.DEPLOY_WEBSITE_WORKER: {
          await new DeployWebsiteWorker(
            workerDefinition,
            context,
            QueueWorkerType.EXECUTOR,
          ).run({
            executeArg: message?.body,
          });
          break;
        }
        case WorkerName.UPDATE_CRUST_STATUS_WORKER: {
          await new UpdateCrustStatusWorker(
            workerDefinition,
            context,
            QueueWorkerType.EXECUTOR,
          ).run({
            executeArg: message?.body,
          });
          break;
        }
        case WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER: {
          await new PrepareMetadataForCollectionWorker(
            workerDefinition,
            context,
            QueueWorkerType.EXECUTOR,
          ).run({
            executeArg: message?.body,
          });
          break;
        }
        case WorkerName.REPUBLISH_IPNS_WORKER:
          await new RepublishIpnsWorker(
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
