import { AppEnvironment, env } from '@apillon/lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { PinToCRUSTWorker } from '../workers/pin-to-crust-worker';
import { WorkerName } from '../workers/worker-executor';

/**
 * Function to execute PinToCRUST worker directly (if local_dev or test), othervise sends message to queue
 * @param context
 * @param CID
 */
export async function pinFileToCRUST(
  context,
  bucket_uuid,
  CID,
  size,
  isDirectory,
) {
  if (
    env.APP_ENV == AppEnvironment.LOCAL_DEV ||
    env.APP_ENV == AppEnvironment.TEST
  ) {
    //Execute PIN to CRUST
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const parameters = {
      bucket_uuid: bucket_uuid,
      CID: CID,
      size: size,
      isDirectory: isDirectory,
    };

    const wd = new WorkerDefinition(
      serviceDef,
      WorkerName.PIN_TO_CRUST_WORKER,
      { parameters },
    );

    const worker = new PinToCRUSTWorker(wd, context, QueueWorkerType.EXECUTOR);
    await worker.runExecutor({
      bucket_uuid: bucket_uuid,
      CID: CID,
      size: size,
      isDirectory: isDirectory,
    });
  } else {
    //send message to SQS - worker will PIN files to CRUST
    await sendToWorkerQueue(
      env.STORAGE_AWS_WORKER_SQS_URL,
      WorkerName.PIN_TO_CRUST_WORKER,
      [
        {
          bucket_uuid: bucket_uuid,
          CID: CID,
          size: size,
        },
      ],
      null,
      null,
    );
  }
}
