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
import { PublishToIPNSWorker } from './publish-to-ipns-worker';
import { UpdateCrustStatusWorker } from './update-crust-status-worker';
import { PrepareMetadataForCollectionWorker } from './prepare-metada-for-collection-worker';
import { PrepareBaseUriForCollectionWorker } from './prepare-base-uri-for-collection-worker';

// get global mysql connection
// global['mysql'] = global['mysql'] || new MySql(env);

export enum WorkerName {
  TEST_WORKER = 'TestWorker',
  SCHEDULER = 'scheduler',
  SYNC_TO_IPFS_WORKER = 'SyncToIpfsWorker',
  DELETE_BUCKET_DIRECTORY_FILE_WORKER = 'DeleteBucketDirectoryFileWorker',
  DEPLOY_WEBSITE_WORKER = 'DeployWebsiteWorker',
  PUBLISH_TO_IPNS_WORKER = 'PublishToIPNSWorker',
  UPDATE_CRUST_STATUS_WORKER = 'UpdateCrustStatusWorker',
  PREPARE_METADATA_FOR_COLLECTION_WORKER = 'PrepareMetadataForCollectionWorker',
  PREPARE_BASE_URI_FOR_COLLECTION_WORKER = 'PrepareBaseUriForCollectionWorker',
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
      case WorkerName.PUBLISH_TO_IPNS_WORKER: {
        await new PublishToIPNSWorker(
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
      case WorkerName.PREPARE_BASE_URI_FOR_COLLECTION_WORKER: {
        await new PrepareBaseUriForCollectionWorker(
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
