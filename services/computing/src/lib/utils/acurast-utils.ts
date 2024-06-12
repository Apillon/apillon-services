import { ServiceContext } from '@apillon/service-lib';
import { AcurastJob } from '../../modules/acurast/models/acurast-job.model';
import {
  BlockchainMicroservice,
  ChainType,
  Context,
  CreateSubstrateTransactionDto,
  PoolConnection,
  SerializeFor,
  SubstrateChain,
} from '@apillon/lib';
import {
  TransactionType,
  ComputingTransactionStatus,
  ContractStatus,
  DbTables,
} from '../../config/types';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { AcurastClient } from '../../modules/clients/acurast.client';
import { v4 as uuidV4 } from 'uuid';

export async function getAcurastEndpoint(context: Context) {
  return (
    await new BlockchainMicroservice(context).getChainEndpoint(
      SubstrateChain.ACURAST,
      ChainType.SUBSTRATE,
    )
  ).data.url;
}

export async function deployAcurastJob(
  context: ServiceContext,
  job: AcurastJob,
  conn?: PoolConnection,
) {
  const acurastClient = new AcurastClient(await getAcurastEndpoint(context));
  const transaction = await acurastClient.createDeployJobTransaction(job);

  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(
    new CreateSubstrateTransactionDto({
      chain: SubstrateChain.ACURAST,
      transaction: transaction.toHex(),
      referenceTable: DbTables.ACURAST_JOB,
      referenceId: job.id,
      project_uuid: job.project_uuid,
    }),
  );

  // Insert tx record to DB
  await TransactionService.saveTransaction(
    new Transaction(
      {
        transaction_uuid: uuidV4,
        walletAddress: response.data.address,
        transactionType: TransactionType.DEPLOY_JOB,
        contract_id: job.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: ComputingTransactionStatus.PENDING,
      },
      context,
    ),
    conn,
  );

  job.jobStatus = ContractStatus.DEPLOY_INITIATED;
  await job.update(SerializeFor.UPDATE_DB, conn);
}
