import { ServiceContext } from '@apillon/service-lib';
import { AcurastJob } from '../../modules/acurast/models/acurast-job.model';
import {
  BlockchainMicroservice,
  ChainType,
  Context,
  CreateSubstrateTransactionDto,
  PoolConnection,
  SerializeFor,
  SqlModelStatus,
  SubstrateChain,
} from '@apillon/lib';
import {
  TransactionType,
  ComputingTransactionStatus,
  DbTables,
  AcurastJobStatus,
} from '../../config/types';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { AcurastClient } from '../../modules/clients/acurast.client';
import { v4 as uuidV4 } from 'uuid';
import { AcurastEncryptionService } from '../../modules/acurast/acurast-encryption.service';
import { JobEnvVar } from '../../modules/acurast/acurast-types';

export async function getAcurastEndpoint(context: Context) {
  return (
    await new BlockchainMicroservice(context).getChainEndpoint(
      SubstrateChain.ACURAST,
      ChainType.SUBSTRATE,
    )
  ).data.url;
}

export async function getAcurastWebsocketUrl() {
  // TODO: replace with env variable?
  return 'wss://websocket-proxy-2.prod.gke.acurast.com/';
}

export async function deployAcurastJob(
  context: ServiceContext,
  job: AcurastJob,
  transaction_uuid: string,
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
        transaction_uuid,
        walletAddress: response.data.address,
        transactionType: TransactionType.DEPLOY_JOB,
        refTable: DbTables.ACURAST_JOB,
        refId: job.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: ComputingTransactionStatus.PENDING,
      },
      context,
    ),
    conn,
  );

  await job
    .populate({
      transactionHash: response.data.transactionHash,
      jobStatus: AcurastJobStatus.DEPLOYING,
      deployerAddress: response.data.address,
    })
    .update(SerializeFor.UPDATE_DB, conn);
}

export async function setAcurastJobEnvironment(
  context: ServiceContext,
  job: AcurastJob,
  variables: JobEnvVar[],
  conn?: PoolConnection,
) {
  const acurastClient = new AcurastClient(await getAcurastEndpoint(context));

  const jobPublicKeys = await acurastClient.getJobPublicKeys(
    job.deployerAddress,
    job.account,
    job.jobId,
  );

  const encryptedVariables =
    await new AcurastEncryptionService().encryptEnvironmentVariables(
      variables,
      jobPublicKeys,
    );

  const transaction = await acurastClient.createSetEnvironmentTransaction(
    job,
    encryptedVariables,
  );

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
        transactionType: TransactionType.SET_JOB_ENVIRONMENT,
        refTable: DbTables.ACURAST_JOB,
        refId: job.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: ComputingTransactionStatus.PENDING,
      },
      context,
    ),
    conn,
  );
}

export async function deleteAcurastJob(
  context: ServiceContext,
  job: AcurastJob,
  conn: PoolConnection,
) {
  // If job is already deployed, delete it from acurast
  if (job.jobId) {
    const acurastClient = new AcurastClient(await getAcurastEndpoint(context));
    const transaction = await acurastClient.createDeregisterJobTransaction(
      job.jobId,
    );

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
          transaction_uuid: uuidV4(),
          walletAddress: response.data.address,
          transactionType: TransactionType.DELETE_JOB,
          refTable: DbTables.ACURAST_JOB,
          refId: job.id,
          transactionHash: response.data.transactionHash,
          transactionStatus: ComputingTransactionStatus.PENDING,
        },
        context,
      ),
      conn,
    );
  }

  job.jobStatus = AcurastJobStatus.DELETED;
  job.status = SqlModelStatus.DELETED;
  await job.update(SerializeFor.UPDATE_DB, conn);
}
