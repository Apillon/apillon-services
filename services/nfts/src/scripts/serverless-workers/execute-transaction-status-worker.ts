import { AppEnvironment, env } from '@apillon/lib';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ServiceContext } from '../../context';
import { TransactionStatusWorker } from '../../workers/transaction-status-worker';
import { WorkerName } from '../../workers/worker-executor';

/**
 * This function is used only for development & testing purposes. In other envirinments, this is dont through work scheduler.
 * @param event
 * @param context
 * @returns
 */
export async function executeTransactionStatusWorker(
  context: ServiceContext,
): Promise<any> {
  if (
    env.APP_ENV == AppEnvironment.LOCAL_DEV ||
    env.APP_ENV == AppEnvironment.TEST
  ) {
    //Directly calls worker
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.LAMBDA,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const wd = new WorkerDefinition(
      serviceDef,
      WorkerName.TRANSACTION_STATUS,
      {},
    );

    const worker = new TransactionStatusWorker(wd, context);
    await worker.execute();

    return true;
  }
  return false;
}
