import {
  AppEnvironment,
  CodeException,
  env,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { BlockchainErrorCode } from '../config/types';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ServiceContext } from '@apillon/service-lib';
import { Transaction } from '../common/models/transaction';
import { substrateChainToWorkerName, WorkerType } from './helpers';
import { SubstrateRpcApi } from '../modules/substrate/rpc-api';
import { TransmitSubstrateTransactionWorker } from '../workers/transmit-substrate-transaction-worker';

/**
 * Function is used to manually execute workers, which are on AWS executed via SQS and jobs
 * @param context
 * @param provider
 * @param transaction
 */
export async function transmitAndProcessSubstrateTransaction(
  context: ServiceContext,
  provider: SubstrateRpcApi,
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
    substrateChainToWorkerName(transaction.chain as SubstrateChain),
    {
      parameters: { chain: transaction.chain },
    },
  );

  const transmitWorker = new TransmitSubstrateTransactionWorker(wd, context);
  await transmitWorker.runExecutor({
    chain: transaction.chain,
  });

  if (env.APP_ENV !== AppEnvironment.TEST) {
    return;
  }
  const { success, contractAddress } = await provider.getLastTransaction();
  if (success) {
    transaction.transactionStatus = TransactionStatus.CONFIRMED;
    if (contractAddress) {
      transaction.data = contractAddress;
    }
  } else {
    transaction.transactionStatus = TransactionStatus.FAILED;
  }

  await transaction.update();
}
