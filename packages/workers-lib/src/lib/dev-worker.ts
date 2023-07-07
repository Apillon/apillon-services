import { LogType, writeLog } from '@apillon/lib';
import { QueueWorkerType } from '../config/types';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from './serverless-workers';

export async function callDevWorker(
  workerName: string,
  workerClass: any,
  parameters?: any,
): Promise<void> {
  writeLog(LogType.INFO, `Starting DEV ${workerName} worker ...`);

  // Directly calls Kilt worker -> USED ONLY FOR DEVELOPMENT!!
  const serviceDef: ServiceDefinition = {
    type: ServiceDefinitionType.SQS,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  };

  const wd = new WorkerDefinition(serviceDef, workerName, {
    parameters,
  });

  const worker = new workerClass(wd, context, QueueWorkerType.EXECUTOR);

  await worker.runExecutor(parameters);
}
