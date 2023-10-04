import {
  AppEnvironment,
  CodeException,
  env,
  EvmChain,
  TransactionStatus,
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
import { ethers } from 'ethers';
import { evmChainToWorkerName, WorkerType } from './helpers';

/**
 * Function is used to manually execute workers, which are on AWS executed via SQS and jobs
 * @param context
 * @param provider
 * @param transaction
 */
export async function transmitAndProcessEvmTransaction(
  context: ServiceContext,
  provider: ethers.providers.JsonRpcProvider,
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
    evmChainToWorkerName(transaction.chain as EvmChain, WorkerType.TRANSMIT),
    {
      parameters: { chain: transaction.chain },
    },
  );

  const transmitWorker = new TransmitEvmTransactionWorker(wd, context);
  await transmitWorker.runExecutor({
    chain: transaction.chain,
  });

  if (env.APP_ENV === AppEnvironment.TEST) {
    const receipt = await provider.send('eth_getTransactionReceipt', [
      transaction.transactionHash,
    ]);
    switch (receipt.status) {
      case '0x1':
        transaction.transactionStatus = TransactionStatus.CONFIRMED;
        break;
      case '0x0':
        transaction.transactionStatus = TransactionStatus.FAILED;
        break;
      default:
        transaction.transactionStatus = TransactionStatus.ERROR;
    }
    await transaction.update();
  }
}
