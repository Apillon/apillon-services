import {
  AppEnvironment,
  CodeException,
  EvmChain,
  TransactionStatus,
  env,
} from '@apillon/lib';
import { BlockchainErrorCode } from '../config/types';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../workers/worker-executor';
import { TransmitEvmTransactionWorker } from '../workers/transmit-evm-transaction-worker';
import { ServiceContext } from '@apillon/service-lib';
import { Transaction } from '../common/models/transaction';
import { EvmTransactionWorker } from '../workers/evm-transaction-worker';

/**
 * Function is used to manually execute workers, which are on AWS executed via SQS and jobs
 * @param context
 * @param chain
 * @param transaction
 */
export async function transmitAndProcessEvmTransaction(
  context: ServiceContext,
  chain: EvmChain,
  transaction: Transaction,
) {
  if (
    env.APP_ENV != AppEnvironment.LOCAL_DEV &&
    env.APP_ENV != AppEnvironment.TEST
  ) {
    throw new CodeException({
      status: 405,
      code: BlockchainErrorCode.ONLY_FOR_LOCAL_DEV_AND_TEST,
      errorCodes: BlockchainErrorCode,
    });
  }

  //Submit transaction to BC
  const transmitWorkerServiceDef: ServiceDefinition = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  };
  const wd = new WorkerDefinition(
    transmitWorkerServiceDef,
    WorkerName.TRANSMIT_EVM_TRANSACTION,
    {
      parameters: { chain: chain },
    },
  );

  const transmitWorker = new TransmitEvmTransactionWorker(wd, context);
  await transmitWorker.runExecutor({
    chain: chain,
  });

  //Check transaction status on indexer - in test environment this cant be performed - graphQl server does not exists for genache provider
  /*if (env.APP_ENV != AppEnvironment.TEST) {
    let tx: Transaction = await new Transaction({}, context).populateById(
      transaction.id,
    );
    do {
      const evnTransactionServiceDef: ServiceDefinition = {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };

      const wd = new WorkerDefinition(
        evnTransactionServiceDef,
        WorkerName.EVM_TRANSACTIONS,
        {
          parameters: { chain: chain },
        },
      );

      const worker = new EvmTransactionWorker(wd, context);
      await worker.runExecutor({
        chain: chain,
      });

      tx = await new Transaction({}, context).populateById(transaction.id);

      setTimeout(() => {
        console.log('Delayed for 1 second.');
      }, 1000);
    } while (tx.transactionStatus == TransactionStatus.PENDING);
  }*/
}
