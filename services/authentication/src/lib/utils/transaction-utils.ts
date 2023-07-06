import {
  ChainType,
  CreateSubstrateTransactionDto,
  Lmas,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  DbTables,
  DidCreateOp,
  IdentityJobStage,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Identity } from '../../modules/identity/models/identity.model';
import { SubmittableExtrinsic } from '@kiltprotocol/sdk-js';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { IdentityJobService } from '../../modules/identity-job/identity-job.service';

/* NOTE: Creates a DID create transaction */
export async function identityCreateRequest(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
  did_create_op: DidCreateOp,
) {
  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `Creating DID create request ...`,
    location: 'Authentication-API/identity/authentication.worker',
    service: ServiceName.AUTHENTICATION_API,
  });

  const dbTxRecord: Transaction = new Transaction({}, context);
  dbTxRecord.populate({
    transactionHash: transaction.hash,
    transactionType: TransactionType.DID_CREATE,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });
  await TransactionService.saveTransaction(dbTxRecord);

  // Init JOB and set current stage
  await IdentityJobService.initOrGetIdentityJob(
    context,
    identity.id,
    // The final stage for this job
    IdentityJobStage.ATESTATION,
  );

  await IdentityJobService.setCurrentStage(
    context,
    identity.id,
    // The final stage for this job
    IdentityJobStage.DID_CREATE,
  );

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        data: {
          email: identity.email,
          did_create_op: did_create_op,
          transactionType: TransactionType.DID_CREATE,
        },
      },
      context,
    );

  return bcServiceRequest;
}

export async function attestationCreateRequest(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
  conn?: PoolConnection,
) {
  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `Creating DID create request ...`,
    location: 'Authentication-API/identity/authentication.worker',
    service: ServiceName.AUTHENTICATION_API,
  });

  const dbTxRecord: Transaction = await new Transaction(
    {},
    context,
  ).populateByRefId(identity.id);

  dbTxRecord.populate({
    transactionHash: transaction.hash,
    transactionType: TransactionType.ATTESTATION,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });

  if (dbTxRecord.exists()) {
    await TransactionService.saveTransaction(dbTxRecord);
  } else {
    await dbTxRecord.update();
  }

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        data: {
          transactionType: TransactionType.ATTESTATION,
        },
      },
      context,
    );

  return bcServiceRequest;
}

/* NOTE: Creates a DID revoke request */
export async function createDIDRevokeBlockhainRequest(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
) {
  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `Creating DID revoke request ...`,
    location: 'Authentication-API/identity/authentication.worker',
    service: ServiceName.AUTHENTICATION_API,
  });
  const dbTxRecord: Transaction = new Transaction({}, context);

  // Init JOB and set current stage
  await IdentityJobService.initOrGetIdentityJob(
    context,
    identity.id,
    // The final stage for this job
    IdentityJobStage.DID_REVOKE,
  );

  await IdentityJobService.setCurrentStage(
    context,
    identity.id,
    // The final stage for this job
    IdentityJobStage.DID_REVOKE,
  );

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction,
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
      },
      context,
    );

  dbTxRecord.populate({
    chainId: SubstrateChain.KILT,
    transactionType: TransactionType.DID_REVOKE,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });

  await TransactionService.saveTransaction(dbTxRecord);

  return bcServiceRequest;
}
